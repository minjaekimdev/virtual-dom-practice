/** @jsx Didact.createElement */
// babel에게 JSX를 만나면 React.createElement를 사용하지 말고 Didact.createElement를 사용하라고 명령
// const element1 = (
//   <div id="container">
//     <h1 title="foo1">Hello Didact</h1>
//     <p>가상 DOM의 구조를 확인해보세요.</p>
//   </div>
// );

// const element2 = (
//   <div id="container">
//     <h1 title="foo2">Hello Didact</h1>
//     <p>가상 DOM의 구조를 확인해보세요.</p>
//   </div>
// );

// const container = document.getElementById("root");

// // 자식: element(가상 DOM 노드), 타겟 노드: <div id="root"></div>(실제 DOM 노드)
// // 렌더 단계를 시작한다.
// Didact.render(element1, container);
// setTimeout(() => Didact.render(element2, container), 1000);

function App(props) {
  return (
    <div id="app-container">
      <h1>안녕하세요, {props.name}님!</h1>
      <p>이것은 함수형 컴포넌트에서 렌더링된 문장입니다.</p>
    </div>
  )
}

// 컴포넌트를 태그처럼 사용(Babel이 처리)
/* 다음과 같은 형식으로 저장된다.
{
  type: App,
  props: {
    name: "민재",
    children: [],
  }
}
*/
const element = <App name="민재" />;

// 렌더링 시작
const container = document.getElementById("root");
Didact.render(element, container);