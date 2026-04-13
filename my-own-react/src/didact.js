// 가상 DOM 노드 생성
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // 자식이 객체(엘리먼트)면 그대로, 문자열이면 텍스트 엘리먼트로 변환
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child),
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// fiber 객체의 정보를 바탕으로 실제 DOM 노드 인스턴스를 생성한다(아직 반영 X)
function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  // 속성(props) 부여
  // children은 제외하고 태그 자체의 속성을 입혀준다.
  const isProperty = (key) => key !== "children";
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

// 처리해야 할 작업 단위가 있을 때: null이 아님
// 처리할 작업 단위가 없을 때: null
let nextUnitOfWork = null;

// 현재 작업중인 루트 노드를 추적한다.
// 공사가 다 끝났을 때(nextUnitOfWork 가 null이 되었을 때) 트리의 꼭대기로 돌아가 한번에 반영해야 함(Commit)
let wipRoot = null;

// 가장 최근에 커밋된 이전 fiber 트리의 루트
let currentRoot = null;

// currentRoot에는 있었지만, wipRoot에는 사라진 파이버들을 모아두는 배열
let deletions = null;

// 이 함수가 실행되어야 workLoop가 일을 시작할 수 있다.
function render(element, container) {
  // 1-1. 작업을 시작할 첫 번째 Fiber(div.root에 대한 파이버)를 만든다.
  // 속성은 기존과 동일하게 dom과 props(children 포함)를 가진다.
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function workLoop(deadline) {
  let shouldYield = false;
  // 처리해야 할 작업 단위가 존재하고, 시간이 충분할 때
  while (nextUnitOfWork && !shouldYield) {
    // 브라우저의 상태를 보면서 일을 시킬지 말지 결정한다.
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    // deadline.timeRemaining(): 지금부터 다음 화면을 그리기까지 정확히 몇 밀리초가 남았는지 알려준다.
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    // 모든 처리가 완료되었고 wipRoot가 생성되었다면
    commitRoot(); // 추가 예정
  }
  requestIdleCallback(workLoop);
}

// 브라우저가 1프레임(16.6ms)동안 할 일들을 처리하고 난 뒤 시간이 남으면 workLoop을 실행하도록 처리
// workLoop 호출 시 deadline 객체를 알아서 넣어준다.
// 실제 리액트 팀에서는 저수준 API를 조합해서 만든 Scheduler 패키지를 별도로 운용하지만, 아이디어는 동일하다.
requestIdleCallback(workLoop);

function commitRoot() {
  // 삭제할 노드를 삭제한다.
  deletions.forEach((fiber) => commitDeletion(fiber));

  // wip트리를 타고 가며 dom을 최신화한다.
  commitWork(wipRoot.child);

  // 커밋이 다 끝나면 wipTree를 currentTree로 저장한다.
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitDeletion(fiber, domParent) {
  if (!domParent) {
    let parentFiber = fiber.parent;
    while (!parentFiber.dom) {
      parentFiber = parentFiber.parent;
    }
    domParent = parentFiber.dom;
  }
  // fiber의 type이 함수형 컴포넌트인 경우 fiber.dom이 존재하지 않는다.
  // 따라서 fiber.child를 각각 모두 삭제해줘야 한다.
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    // 함수형 컴포넌트라면
    if (fiber.child) {
      commitDeletion(fiber.child, domParent);

      let sibling = fiber.child.sibling;
      while (sibling) {
        commitDeletion(sibling, domParent);
        sibling = sibling.sibling;
      }
    }
  }
}

function commitWork(fiber) {
  if (!fiber) return;
  // 현재는 WIP 트리가 만들어진 상태
  // WIP 트리를 검사하며 노드들을 처리하고, 이를 실제 DOM 트리에 반영한다.

  // effectTag가 UPDATE인 경우
  if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    const oldProps = fiber.alternate.props;
    const newProps = fiber.props;

    // 기존 props에 있는 속성을 새 props에만 있는 속성으로 업데이트
    for (const [key, value] of Object.entries(newProps)) {
      if (key === "children") {
        continue;
      }
      if (value != oldProps[key]) {
        // 이벤트 중복등록 해결하기
        if (key.startsWith("on")) {
          const eventType = key.toLowerCase().substring(2);

          if (oldProps[key]) {
            fiber.dom.removeEventListener(eventType, oldProps[key]);
          }
          fiber.dom.addEventListener(eventType, value);
        } else {
          fiber.dom[key] = value;
        }
      }
    }
    // 기존 props에만 있고, 새 props에는 없는 속성을 삭제
    for (const [key] of Object.entries(oldProps)) {
      if (key === "children") continue;

      if (newProps[key] === undefined) {
        fiber.dom.removeAttribute(key);
      }
    }
  }

  // effectTag가 PLACEMENT인 경우
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    let parentFiber = fiber.parent;
    while (!parentFiber.dom) {
      parentFiber = parentFiber.parent;
    }
    parentFiber.dom.appendChild(fiber.dom);
  }

  if (fiber.child) {
    commitWork(fiber.child);
  }
  if (fiber.sibling) {
    commitWork(fiber.sibling);
  }
}

// 여기서 diffing을 실행한다.
// elements(children)에 대한 fiber를 생성하고, 이들과 wipFiber의 부모 관계를 연결한다.
// children 간의 sibling 관계도 연결한다(1 -> 2 단방향)
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  // 1. 비교 대상(과거의 나)의 첫 번째 자식을 찾는다.
  // wipFiber.alternate가 있다면 그 녀석의 child가 첫 번째 oldFiber
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;

  let prevSibling = null;

  // 2. 새 설계도(elements)를 끝까지 돌거나,
  // 과거의 기록(oldFiber)이 아직 남아있을 때까지 반복문을 돈다.
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    // 타입 비교 (Diffing)
    // - oldFiber가 있고, 새 element도 있고, 둘의 type이 같은가?
    const sameType = oldFiber && element && element.type == oldFiber.type;

    if (sameType) {
      // [CASE 1] 업데이트 (UPDATE)
      // - 기존 DOM 노드를 그대로 가져다 씁니다 (oldFiber.dom). -> 성능 최적화의 핵심
      // - 새로운 props만 챙겨서 파이버를 만드세요.
      // - alternate에 oldFiber를 연결한다.
      // alternate는 타입이 같은 경우에 기존 노드의 데이터를 물려받기 위함이다. 따라서 다르거나 새로 생성해야 하는 경우 null이 저장된다.
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      // [CASE 2] 새로 생성 (PLACEMENT)
      // - 타입이 다르거나, 이전에 없었던 경우
      // - dom은 null로 시작(추후 commit 단계에서 만들 예정)
      // - alternate는 당연히 null
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber, // 모든 자식은 부모를 알고있다.
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      // [CASE 3] 삭제 (DELETION)
      // - 옛날엔 있었는데 이번엔 없거나 타입이 바뀐 경우
      // - oldFiber에 'DELETION' 꼬리표를 달고, 전역 변수 deletions 배열에 push 해준다.
      // oldFiber에 DELETION이라는 꼬리표를 달아줘야 하는 이유는, useEffect같은 훅을 구현할 때 클린업 같은걸 실행해줘야 하기 때문이다.
      ((oldFiber.effectTag = "DELETION"), deletions.push(oldFiber));
    }

    // 3. 다음 비교를 위해 포인터를 옮깁니다.
    if (oldFiber) {
      // oldFiber는 옆 동생(sibling)으로 이동!
      oldFiber = oldFiber.sibling;
    }

    // 4. (기존 로직과 동일)
    // 첫 번째 자식이면 wipFiber.child에, 아니면 prevSibling.sibling에 연결한다.
    // 부모는 첫 번째 자식만 기억한다.
    if (newFiber) {
      if (index === 0) {
        wipFiber.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }

    index++;
  }
}

function updateFunctionComponent(fiber) {
  reconcileChildren(fiber, [fiber.type(fiber.props)]);
}

function updateHostComponent(fiber) {
  // 1. 실제 DOM 노드를 만들어서 fiber.dom에 연결 (createDom 사용)
  // reder 함수를 처음 호출한 경우에는 이미 fiber.dom에 실제 dom이 연결된 상태이다.
  // 따라서 그렇지 않은 경우에만 실제 DOM 노드를 만들어 연결해준다.
  if (!fiber.dom) {
    // createDom으로 실제 DOM 노드 만들기
    // commit 단계에서의 화면 끊김(jank)를 방지하기 위해 일단 만들어두고, 한번에 반영한다.
    // 여기서 미리 만들어두는데, 이거 만드는것도 비용이지 않을까? -> 실제 리액트에서는 다르게 동작
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}

// 가상 DOM 노드들을 재료로 삼아 파이버 트리를 만든다.
function performUnitOfWork(fiber) {
  const isFunctionComponent = typeof fiber.type === "function";

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 3. 다음 작업 단위(Next Unit of Work)를 찾아서 반환
  // 자식이 있으면 자식으로 간다
  if (fiber.child) {
    return fiber.child;
  }

  // 자식이 없으면 형제를 찾는다
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }

  return null;
}

const Didact = {
  createElement,
  render,
};

// 브라우저 환경에서 전역 변수로 할당 (Babel Standalone 대응)
// 추후 index.js 실행 시 Didact 사용을 위함
window.Didact = Didact;
