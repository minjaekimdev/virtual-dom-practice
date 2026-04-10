/** @jsx Didact.createElement */
// babel에게 JSX를 만나면 React.createElement를 사용하지 말고 Didact.createElement를 사용하라고 명령
const element = (
  <div id="container">
    <h1 title="foo">Hello Didact</h1>
    <p>가상 DOM의 구조를 확인해보세요.</p>
  </div>
);

const container = document.getElementById("root");

// 자식: element(가상 DOM 노드), 타겟 노드: <div id="root"></div>(실제 DOM 노드)
// 렌더 단계를 시작한다.
Didact.render(element, container);