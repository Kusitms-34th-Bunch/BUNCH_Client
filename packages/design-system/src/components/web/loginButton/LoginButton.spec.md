# 컴포넌트: LoginButton

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 스크린샷과 눈으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Login Button - Brand`(node `796:4718`)와 `Login Button - Status`(node `796:4739`).
- 화면 설계서: Figma `화면 설계서 - 로그인, 이용약관, 프로필 작성`(node `796:9226`)의 로그인 화면(경로: 로그인 > 소셜 로그인 인증 > 이용약관) 중 2번 "소셜 로그인 영역"(node `796:4536`). 이 화면에서 Kakao·Google·Apple 버튼 3개를 세로로 놓는다(간격 8px, 좌우 16px).

## 목적과 범위

### 제공하는 동작

- 소셜 로그인 버튼. 브랜드 3종(`apple`, `google`, `kakao`)마다 배경·글자색·로고가 정해져 있다.
- 기본, 눌림(`:active`), 비활성(`disabled`) 상태. 설계서 기준으로 누르는 동안 Pressed 스타일을 적용하고 전환은 Dissolve / Ease out / 100ms다(overlay opacity만 100ms ease-out).
- 폭은 컨테이너를 채우고(Figma 343px) 높이는 48px이다.

### 제공하지 않는 동작

- 로딩 상태, hover, 로고 없는 버튼은 디자인에 없어서 만들지 않았다.
- 로그인 인증 동작(설계서: On Tap → 해당 소셜 로그인 인증 프로세스 실행, 성공 시 회원 정보 확인, 실패 시 현재 화면 유지와 오류 메시지, 취소 시 현재 화면 유지)과 오류 메시지는 화면(feature)이 맡는다. 버튼은 클릭 이벤트와 `disabled`만 제공한다.
- 브랜드 글자("Google로 계속하기" 등)는 제품 문구라서 `children`으로 받는다.

## Public API

- Props: `brand`(필수), `children`(필수, 접근성 이름), 그리고 native `<button>`의 모든 속성(`onClick`, `disabled`, `type`, `className`, `aria-*` 등).
- 기본 `type`은 `button`이다. form 안에서 제출하려면 `type="submit"`을 준다.
- 호출자 소유 책임: 버튼 글자(문구·i18n), 클릭 동작(OAuth 시작 등), 폭 같은 배치 클래스, 로그인 처리 중 중복 선택 방지(설계서 요구). 처리 중에는 세 버튼 모두 `disabled`를 넘긴다.

## 상태와 동작

- 눌림: 브랜드 색 위에 `overlay-hover`(검정 10%) 오버레이. 설계서 전환(Dissolve / Ease out / 100ms)에 맞춰 opacity를 100ms ease-out으로 바꾼다. Apple은 검정이라 눈에 띄지 않는다(Figma와 같음).
- 비활성: 전체에 `opacity-disabled`(40%)를 적용하고 `cursor-not-allowed`.
- 긴 글자: 한 줄로 잘린다(`truncate`).
- 로고: Apple 24px, Kakao 20px, Google 20px 영역(안쪽 16×16.3). Apple·Kakao는 글자색을 따라가고(`currentColor`) Google은 색이 든 이미지다.

## 접근성

- Semantic element: native `<button>`. 로고는 `aria-hidden`이라 이름에 포함되지 않는다.
- Keyboard·focus: native button의 Tab·Enter·Space. `focus-visible` 링은 다른 버튼과 같다.
- 비활성은 native `disabled`라 클릭과 키보드가 모두 막힌다.

## Styling과 의존성

- Token: `h-s18`(48), `rounded-r6`(12), `px-padding-p8`(16), `py-padding-p7`(14), `gap-s3`(6), `typography-login-button`(15/22), `bg-surface-primary`, `text-text-inversed`, `before:bg-overlay-hover`, `border-border-brand`(focus), `--semantic-opacity-disabled`.
- 브랜드 색은 토큰이 없어 값을 직접 쓴다: Kakao `#fee500`·글자 검정 85%, Google 테두리 `#e2e2e2`·글자 `#1f1f1f`, Apple 검정. 각 사의 가이드 색이라 디자인 시스템 토큰으로 만들지 않았다.
- dependency 추가 없음. Google 로고는 `assets/google-logo.png`(Figma 원본)를 `new URL(..., import.meta.url)`로 참조한다.
- Storybook state matrix: `Default`, `Brands`, `Disabled`, `LongLabel`.

## 확인할 항목

- 로고 에셋 (제안): 아이콘 생성 파이프라인이 16/20/24 세 크기를 요구해서 로고는 `LoginButton.tsx` 안에 두었다. Apple·Kakao는 Figma 원본 path를 그대로 옮기고 색만 `currentColor`로 바꿨다. Google은 Figma가 마스크+PNG로 만든 색 이미지라 PNG 원본을 쓴다. 정식 벡터 SVG를 받으면 교체한다.
- Google 로고 로딩 (미정): `new URL('./assets/google-logo.png', import.meta.url)`를 Storybook(Vite)에서 확인했다. `apps/web`(Next.js)에서 실제로 쓰는 화면이 생길 때 번들링을 확인한다.
- 로그인 처리 중 상태 (제안): 설계서가 "로그인 처리 중 중복 선택 방지"만 요구하고 처리 중 버튼 모양은 디자인에 없다. 그래서 로딩 표시 없이 호출자가 `disabled`로 막는 방식으로 두었다. 처리 중 시각 표현이 필요하면 디자이너 확인 후 추가한다.
- 로그인 버튼 클릭 전환 (미정): 설계서의 "Login Action: Dissolve / Ease Out / 200ms"는 인증 시작 뒤 화면 전환이라 버튼이 아니라 화면 쪽 일이다.
- 눌림 오버레이 농도 (제안): Figma 스크린샷 색과 가장 가까운 `overlay-hover`(10%)를 썼다. 정확한 값은 디자이너 확인.
- 흰 배경 토큰 (제안): Google 배경은 Figma `text-inversed`(흰색)이고 `surface-primary`를 썼다. 값은 같다.
- Google 글자·테두리 색 (제안): Figma가 변수 없이 `#1f1f1f`, `#e2e2e2`를 직접 쓰고 있어 같은 값을 썼다.
- 한글 줄바꿈: 한 줄로 자르는 버튼이라 `break-keep`은 쓰지 않았다.
- Google 테두리 대비 (미정): `#e2e2e2` 테두리가 흰 배경에서 약 1.3:1이라 비텍스트 대비 3:1에 못 미친다. Google 가이드·Figma 값이라 바꾸지 않았고, 로그인 화면 배경이 흰색이 아닐 때의 대비를 디자이너와 확인한다.
- 잘린 문구 (제안): 긴 문구는 한 줄로 잘리고 전체 문구를 볼 방법이 없다(접근성 이름은 전체 텍스트). 실제 문구가 짧아 두었으며, 좁은 폭이나 번역으로 길어지면 다시 본다.
- 포커스 링 (미검증): 다른 버튼과 같은 `outline-border-brand`다. Kakao 노랑 위에서 구분되는지는 눈으로 확인하지 않았다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `loginButton` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(226 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인(390px 폭, Figma 스크린샷과 눈 대조: Default·Disabled). Pressed 전환 100ms·포커스·픽셀 단위 대조·실기기는 미검증
