export type SafeAreaInsets = { top: number; bottom: number; left: number; right: number };

const px = (value: number) => `${Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0}px`;

/**
 * 네이티브 Safe Area를 웹 CSS 변수(--native-safe-area-*)로 주입하는 스크립트 생성
 * 문서 시작 시점에 documentElement가 없는 경우 대응(readystatechange에서 적용)
 */
export const buildSafeAreaScript = ({ top, bottom, left, right }: SafeAreaInsets) => {
  const entries = Object.entries({ top, bottom, left, right })
    .map(([side, value]) => `s.setProperty('--native-safe-area-${side}','${px(value)}');`)
    .join('');

  return `(function(){var set=function(){var d=document.documentElement;if(!d){return;}var s=d.style;${entries}};if(document.documentElement){set();}else{document.addEventListener('readystatechange',set);}})();true;`;
};
