/** @jsx Didact.createElement */
const element = (
  <div id="container">
    <h1 title="foo">Hello Didact</h1>
    <p>가상 DOM의 구조를 확인해보세요.</p>
  </div>
);

// 생성된 객체(가상 DOM)를 콘솔에서 확인
console.log("Virtual DOM Object:", element);

// 다음 단계에서 구현할 임시 render (구조 확인용)
const container = document.getElementById("root");
container.innerHTML = `<pre>${JSON.stringify(element, null, 2)}</pre>`;