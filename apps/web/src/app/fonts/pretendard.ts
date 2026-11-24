import localFont from 'next/font/local';

// Pretendard 1.3.9를 굵기 400~700·쓰는 글자 범위로 줄인 가변 폰트 한 파일(SIL OFL 1.1 수정본이라 이름은 BunchSans, #534)
// 만드는 방법과 범위: docs/decisions/records/013-pretendard-self-hosting.md. (app) layout과 루트 not-found가 함께 씀
const pretendard = localFont({
  src: './BunchSansVariable.woff2',
  weight: '400 700',
  display: 'swap',
});

// 토큰의 글꼴 이름을 불러온 글꼴로 교체. 모달·토스트가 body에 portal로 그려져 :root에 적용
export const pretendardFontStyle = `:root{--primitive-font-family-pretendard:${pretendard.style.fontFamily};}body{font-family:var(--primitive-font-family-pretendard);}`;
