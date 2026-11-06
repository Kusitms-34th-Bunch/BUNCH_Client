import localFont from 'next/font/local';

// Pretendard 1.3.9 가변 폰트 한 파일(SIL OFL 1.1). 처음 오는 웹 화면과의 구분: docs/decisions/records/013-pretendard-self-hosting.md
// (app) layout과 루트 not-found가 함께 씀(루트 not-found는 (app) layout 밖에서 그려짐)
const pretendard = localFont({
  src: './PretendardVariable.woff2',
  weight: '45 920',
  display: 'swap',
});

// 토큰의 글꼴 이름을 불러온 글꼴로 교체. 모달·토스트가 body에 portal로 그려져 :root에 적용
export const pretendardFontStyle = `:root{--primitive-font-family-pretendard:${pretendard.style.fontFamily};}body{font-family:var(--primitive-font-family-pretendard);}`;
