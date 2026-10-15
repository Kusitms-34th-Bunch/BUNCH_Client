export type SafeAreaInsets = { top: number; bottom: number; left: number; right: number };

const px = (value: number) => `${Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0}px`;

/**
 * 네이티브가 측정한 Safe Area를 웹의 CSS 변수(`--native-safe-area-*`)로 넣는 스크립트를 만든다.
 * 웹은 이 변수가 있으면 그 값을, 없으면 env(safe-area-inset-*)를 쓴다(apps/web/src/app/globals.css).
 * 문서가 만들어지기 전에는 documentElement가 없을 수 있어 생기면 적용한다.
 */
export const buildSafeAreaScript = ({ top, bottom, left, right }: SafeAreaInsets) => {
  const entries = Object.entries({ top, bottom, left, right })
    .map(([side, value]) => `s.setProperty('--native-safe-area-${side}','${px(value)}');`)
    .join('');

  return `(function(){var set=function(){var d=document.documentElement;if(!d){return;}var s=d.style;${entries}};if(document.documentElement){set();}else{document.addEventListener('readystatechange',set);}})();true;`;
};
