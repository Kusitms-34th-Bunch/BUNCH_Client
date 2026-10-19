# 페이지: 로그인(Entry)

## 메타데이터

- Route: `/login`(`apps/web/src/app/(app)/login/page.tsx`)
- Status: UI 구현됨(`next build` 결과를 Figma 값과 측정으로 대조함. 실기기 검증 전). 소셜 로그인 연동·결과 분기·접근 제어는 연결하지 않음
- 디자인 출처: Figma `로그인`(node `796:4634`). 화면 설계서는 `로그인 - 1`(node `796:5339`, 설계서 `796:9226`). 기능 spec은 `docs/specs/login-signup.md`(1.2 Entry).

## 목적과 범위

### 포함

- 앱을 처음 연 사람이 소셜 계정으로 시작하는 화면의 UI. 회원가입과 로그인을 나누지 않으므로 회원가입 버튼·이메일 입력란은 없다.
- 구성: 브랜딩 영역(앱 아이콘 120×120, 로고, 슬로건 「함께한 순간을, 우리 그룹의 기록으로」)과 하단 소셜 로그인 버튼 3개(카카오 → Google → Apple, `LoginButton`).
- 진행 상태: 버튼 하나를 누르면 그 버튼은 진행 중(`aria-busy`), 나머지 둘은 비활성화된다. 진행 중에는 다른 시도를 무시한다(연타·동시 로그인 방지).
- 실패하면 토스트 「로그인에 실패했어요. 다시 시도해 주세요」를 보이고 버튼이 처음 상태로 돌아온다. 사용자가 로그인 창을 닫은 경우(`cancelled`)는 토스트 없이 돌아온다.

### 범위 외

- 소셜 SDK 호출(bridge `socialLogin`, 쉘 네이티브)과 서버 로그인(인증 BFF). 연결 전에는 `signIn`이 없어 버튼을 눌러도 아무 일도 일어나지 않는다(진행 상태·토스트도 없다). 실패·취소·성공 처리와 실패 토스트는 `signIn`을 연결할 때 실제로 나온다.
- 로그인 결과에 따른 이동(처음 온 사람 → 약관, 가입 중 → 약관·프로필, 가입 완료 → 도착지)과 앱 실행 시 세션 확인·스플래시.
- 초대 정보 보관·전달.
- iPhone 상태 바·홈 인디케이터. 기기 요소라 웹이 그리지 않는다(Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/login`. params와 search는 없다.
- 접근 권한·guard: 아직 없다. spec은 비로그인만 들어올 수 있고 로그인 상태면 상태별 화면으로 보내야 하지만(`docs/specs/login-signup.md` 사용자 흐름) 세션 확인이 없어 막지 않는다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 이동과 redirect는 없다. 화면 전환 규칙(`AppTransitions`)에도 등록하지 않아 page 래퍼에 `data-ssgoi-transition`을 붙이지 않았다(`/signup/terms` 등으로 가는 전환 규칙을 넣을 때 함께 붙인다). 인증 전 화면이 `(app)`의 `OverlayProvider`·`Toaster`를 공유하는 것은 실패 토스트에 필요해서이고, 인증 전용 group 분리는 접근 제어를 만들 때 함께 판단한다.

## 상태와 흐름

- 초기 진입: 정적 화면이다. 데이터 요청이 없다.
- Loading: 로그인 요청 중. 누른 버튼은 눌러도 되는 모양 그대로 `aria-busy="true"`이고 나머지 둘은 `disabled`(40% 투명)라 어느 로그인이 진행 중인지 보인다. 버튼 안 로딩 표시(스피너)는 Figma에 없어 만들지 않았다. 스크린 리더에는 `aria-busy`만으로 전달이 부족해 화면에 보이지 않는 `role="status"` 문구 「로그인하는 중이에요」를 진행 중에만 채운다(문구는 임의로 정했다, 기획 확인).
- Empty: 해당 없음.
- Error·retry: 실패 시 토스트와 버튼 복귀. 토스트는 기획 명세대로 하단 버튼 바로 위에 놓는다(`bottomOffset: 176`, 기본 위치 Safe Area + 16px에서 버튼 영역 위 12px까지. 이전 코드 상태에서 375·390폭 간격 12px 확인). 다시 눌러 재시도할 수 있다. 오류 원인은 따로 기록하지 않는다(Sentry 전송 없음).
- Disabled·invalid: 다른 소셜 로그인이 진행 중인 버튼.
- Success·완료 후 이동: 성공하면 결과 분기로 이동할 때까지 버튼을 잠근 채 둔다. 분기는 인증 BFF가 생긴 뒤에 붙으므로 지금은 성공해도 화면이 바뀌지 않는다.

## 데이터 의존성

- Query와 enabled 조건: 없음.
- Mutation·cache 영향: 없음. 연결 시 로그인 성공 뒤 `auth.session`을 invalidate한 뒤 이동한다(`docs/specs/login-signup.md` API 계약).
- API 계약 확인 항목: 소셜 로그인 요청의 method·path·필드, 쿠키 설정 주체(`docs/specs/login-signup.md` 확인할 항목 백엔드 1~3).
- 연결 지점: `LoginEntry`의 `signIn` prop(테스트용·연결용)과 `useSocialLogin`이 받는 `SignIn` 함수 타입(`(provider) => Promise<'success' | 'cancelled'>`). 실제 연동은 이 함수를 구현해 넘기면 된다. 서버 컴포넌트인 page에서 함수를 prop으로 넘길 수 없으므로, 연결할 때는 `LoginEntry` 안에서 bridge·BFF 호출을 가져온다.

## UI와 접근성

- Component mapping: `web`의 `LoginButton`(브랜드별 색·로고, 눌림 100ms Ease Out은 컴포넌트가 처리). 브랜딩 영역은 이 화면 전용이다. 앱 아이콘은 `next/image`(`public/images/app-icon.png`, 우선 로드), 로고는 `public/images/bunch-logo.svg`.
- Keyboard·focus·accessible name: 로고 이미지가 화면 제목(`h1`, 이름 「Bunch」)이고 앱 아이콘은 장식(`alt=""`)이다. 버튼 이름은 「카카오 로그인」「Google로 계속하기」「Apple로 계속하기」(Figma 문구)이고 Tab 순서는 화면 순서와 같다. 비활성 버튼은 native `disabled`라 포커스가 가지 않는다. 로그인 실패 토스트는 DS `Toaster`가 알린다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 버튼 폭은 `w-full`(화면 좌우 16px), 버튼 글자는 길면 잘린다(`LoginButton`). 375×812와 390×844에서 가로 넘침이 없다. 브랜딩 영역은 버튼을 뺀 본문 영역에서 가운데 정렬이라 화면이 낮아지면 본문이 스크롤된다.

| Figma            | 값                                    | 사용한 토큰·utility                           |
| ---------------- | ------------------------------------- | --------------------------------------------- |
| 앱 아이콘        | 120×120, radius 24                    | `size-30 rounded-r10 object-cover`            |
| 아이콘↔로고      | 간격 24                               | `gap-s12`                                     |
| 로고             | 136.3×40                              | `h-10 w-auto`                                 |
| 로고↔슬로건      | 간격 12                               | `gap-s6`                                      |
| 슬로건           | Body-1-Medium 16/24, `text-tertiary`  | `typography-body-1-medium text-text-tertiary` |
| 버튼 영역        | 좌우 16, 버튼 간격 8, 아래 20(+홈 34) | `px-padding-p8 gap-s4 pb-s10`                 |
| 소셜 로그인 버튼 | 343×48, radius 12                     | `LoginButton`                                 |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 `/login`이 정적 페이지로 생성되고 `next start`로 직접 URL 200 응답을 확인함. 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증, 확인할 항목)
- [x] 상태별 UI: 기본·진행 중(누른 버튼 / 나머지 비활성)·실패·취소·성공 잠금을 테스트로 확인. 진행 중 버튼의 실제 모양은 눈으로 확인하지 못함
- [x] 관련 test: `LoginEntry.test.tsx`(제목·슬로건·main, 버튼 순서, 소셜별 호출, 진행 중 상태, 연타 방지, 실패·취소·성공, 재시도, 연결 전에는 무반응, 진행 중 상태 안내, 앱 아이콘 장식)
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812, 390×844)에서 앱 아이콘·로고·슬로건·버튼 크기와 간격, 슬로건 글자 크기·굵기·색을 Figma와 대조(진행 중 상태 안내(`role="status"`) 추가 전 코드 상태에서 측정, 이 안내는 화면에 보이지 않는다). 실기기와 픽셀 비교는 하지 못함

## 확인할 항목

- 브랜딩 위치 (제안): Figma는 상태 바 아래에서 앱 아이콘이 위에서 235px에 놓이는 절대 배치다. 화면 높이가 달라져도 어색하지 않도록 버튼 위 영역에서 가운데 정렬했다. 상태 바 62px 기준으로 Figma보다 약 15px 위에 놓인다. 디자이너 확인.
- 임시 에셋 (확정 필요): 앱 아이콘(`app-icon.png`)과 로고(`bunch-logo.svg`)는 Figma 임시 디자인이고 화면 설계서는 최종 확정 디자인으로 교체한다고 한다. 앱 아이콘 원본이 정사각형이 아니라(922×896) `object-cover`로 맞췄다.
- 로그인 중 모양 (디자인 확인): 선택한 버튼의 로딩 표시는 Figma에 없다(`docs/specs/login-signup.md` 디자인 확인 4번).
- 실패 토스트 위치 (확정): 기획 명세가 오류 토스트를 "하단 버튼 바로 위"에 두라고 해서(`Toast.spec.md` 표시 위치) `bottomOffset`으로 버튼 영역 위 12px에 놓았다. 12px 간격은 기획·Figma에 없어 정한 값이다(디자이너 확인). Figma 설계서는 「오류 메시지 노출」이라고만 적었다. 버튼 영역 높이가 바뀌면(버튼 추가, 아래 여백 변경) 이 값도 함께 바꾼다.
- 취소 안내 (기획 확인): 로그인 창을 닫았을 때 토스트를 보일지 명세가 충돌한다(`docs/specs/login-signup.md` 기획 확인 4번). 지금은 토스트 없이 버튼만 처음 상태로 돌린다.
- 접근 조건 (미정): 로그인 상태일 때 어디로 보낼지는 인증 BFF와 도착지 규칙이 정해진 뒤 연결한다.
- 노출 전 선행 조건: 소셜 로그인이 연결되기 전에는 버튼이 눌려도 반응이 없다. UT·배포에 노출하기 전에 연동하거나 이 route를 노출하지 않는다. 정적 페이지로 생성되어 색인될 수 있으므로 metadata·색인 방지(`docs/workflows/seo.md`)도 이 노출 정책에 포함해 정한다.
