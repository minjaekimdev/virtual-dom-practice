// 가상 DOM의 설계도 작성
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

const Didact = {
  createElement,
};

// 브라우저 환경에서 전역 변수로 할당 (Babel Standalone 대응)
// 추후 index.js 실행 시 Didact 사용을 위함 
window.Didact = Didact;
