# 페이지: 약관 동의

## 메타데이터

- Route: `/signup/terms`(`apps/web/src/app/(app)/signup/terms/page.tsx`)
- Status: UI 구현됨(`next build` 결과를 Figma 값과 측정으로 대조함. 실기기 검증 전). 시작하기 버튼의 약관 저장·권한 요청·이동과 접근 제어는 연결하지 않음
- 디자인 출처: Figma `이용약관`(node `796:4654`). 화면설계서(node `796:5872`, 설계서 프레임 `796:9226`). 기능 spec은 `docs/specs/login-signup.md`(1.3 약관 동의).

## 목적과 범위

### 포함

- 가입 중인 사용자가 필수 약관 3개(서비스 이용 약관, 개인정보 수집 및 이용 동의, 만 14세 이상 확인)에 동의하는 화면의 UI.
- 구성: 헤더(뒤로 가기), 제목·설명(`PageHeader`), 「필수 항목 모두 체크하기」(`Label`), 약관 행 3개(`TermsLabel`), 앱 접근 권한 안내, 하단 고정 「시작하기」 버튼.
- 전체 동의와 개별 체크의 동기화: 전체 체크는 모든 항목을 체크하고, 이미 모두 체크된 상태에서 누르면 모두 해제한다. 개별 항목을 모두 체크하면 전체 체크도 체크되고 하나를 풀면 풀린다.
- 시작하기 버튼은 최초 비활성이고 필수 약관 3개를 모두 체크하면 활성화된다.
- 원문이 있는 약관(서비스 이용 약관, 개인정보)은 오른쪽 chevron 버튼으로 원문 화면(`/signup/terms/<id>`)에 이동하고, 다녀와도 체크 상태가 유지된다(`signup/layout.tsx`의 provider가 소유). 만 14세 확인은 원문이 없다.
- 가입 단계가 함께 쓰는 틀 `SignupFrame`(상단 고정 헤더 + 하단 고정 영역)을 이 화면에서 만들었고, 약관 원문 화면도 쓴다.

### 범위 외

- 시작하기를 누를 때의 약관 동의 저장, 사진 → 카메라 → 알림 권한 요청(iOS 시스템 팝업), 프로필 화면 이동. 버튼은 활성화만 되고 눌러도 동작이 없다.
- 접근 제어(가입 중인 사용자만 진입, 이미 동의한 사용자는 건너뛰기)와 앱 실행 시 진입 분기.
- 마케팅 수신 동의(받지 않기로 확정), 위치 권한 안내(요청하지 않음).
- iPhone 상태 바·홈 인디케이터. 기기 요소라 웹이 그리지 않는다(Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/signup/terms`. params와 search는 없다.
- 접근 권한·guard: 아직 없다. spec은 가입 중인 사용자만 들어올 수 있고 이미 동의한 사용자는 건너뛰어야 하지만 세션이 없어 막지 않는다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다(`SignupFrame`). redirect는 없다. 원문 보기는 `router.push`, 뒤로 가기는 `router.back()`이다. 화면 전환 규칙(`AppTransitions`)에는 등록하지 않았다.

## 상태와 흐름

- 초기 진입: 정적 화면이다. 모두 체크 해제 상태이고 시작하기 버튼은 비활성이다.
- Loading·Empty: 해당 없음(요청이 없다).
- Error·retry: 해당 없음. 저장 실패 문구(「일시적인 오류가 발생했어요. 다시 시도해 주세요」)는 저장을 연결할 때 붙인다.
- Disabled·invalid: 필수 약관 하나라도 체크하지 않으면 시작하기 버튼이 비활성(`disabled`)이다. 안내 문구는 없다.
- Success·완료 후 이동: 연결하지 않았다. 새로고침하면 체크 상태가 사라진다.

## 데이터 의존성

- Query와 enabled 조건: 없음(약관 목록·버전은 서버에서 받지 않고 `constants/terms.ts`에 둔다).
- Mutation·cache 영향: 없음. 연결 시 항목별 약관 버전과 동의 일시를 저장한다(`docs/specs/login-signup.md` API 계약).
- API 계약 확인 항목: 약관 목록·원문·버전 제공 방식(`login-signup.md` 확인할 항목 백엔드 4번).

## UI와 접근성

- Component mapping: `web`의 `PageHeader`, `Label`, `TermsLabel`, `core`의 `Button`(primary·lg), `Header`(`SignupFrame`). 권한 안내는 이 화면 전용(`PermissionGuide`)이다. 뒤로 가기 버튼은 온보딩과 같은 `HeaderIconButton`(`tone`으로 색만 다르다)이며 두 feature가 쓰도록 `shared/components/layout`으로 옮겼다.
- Keyboard·focus·accessible name: 체크박스는 native `input`이라 Tab·Space로 바뀐다. 「필수 항목 모두 체크하기」와 약관 행(이름 「[필수] 서비스 이용 약관」 등)은 각각 checkbox이고, 원문 보기 버튼 이름은 「서비스 이용 약관 내용 보기」처럼 약관 이름을 포함한다. `PageHeader`의 제목이 `h1`, 권한 안내 제목이 `h2`이며 권한 3개는 목록(`ul`)이다. 권한 안내는 누를 수 있는 요소가 없다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 좌우 16px이고 375px에서 가로 넘침이 없다. 약관 이름이 길어지면 `TermsLabel` 안에서 줄바꿈된다. 본문은 `main`에서 스크롤되고 시작하기 버튼은 아래에 고정된다. 본문 아래에는 스크롤 끝에서 버튼에 붙지 않도록 16px 여백을 두었다(Figma에 없는 값).

| Figma            | 값                                           | 사용한 토큰·utility                                                          |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| 제목·설명 영역   | 헤더 아래, 높이 65                           | `PageHeader`                                                                 |
| 제목 영역 ↔ 약관 | 간격 56                                      | `pt-s20`                                                                     |
| 약관 영역        | 좌우 16, 전체 체크와 약관 사이 12, 행 간격 8 | `px-padding-p8 gap-s6 gap-s4`                                                |
| 약관 ↔ 권한 안내 | 간격 40                                      | `gap-s16`                                                                    |
| 권한 안내 제목   | Heading-2-SemiBold 18/27                     | `typography-heading-2-semibold text-text-primary`                            |
| 제목 ↔ 목록      | 간격 20, 목록 좌우 8, 항목 간격 10           | `gap-s10 px-padding-p4 gap-s5`                                               |
| 권한 이름·설명   | Body-1-Medium 16/24, Caption-1-Regular 12/16 | `typography-body-1-medium`·`typography-caption-1-regular text-text-tertiary` |
| 시작하기 버튼    | 343×48, 위 14, Label-L 17/26                 | `Button`(primary, lg) `pt-padding-p7`                                        |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 `/signup/terms`가 정적 페이지로 생성되고 `next start`로 직접 URL 200 응답을 확인함. 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증, 확인할 항목)
- [x] 상태별 UI: 전체·개별 체크 동기화, 전체 해제, 시작하기 활성·비활성, 원문 보기 이동, 원문을 다녀온 뒤 체크 유지를 테스트로 확인
- [x] 관련 test: `TermsAgreement.test.tsx`
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 제목·설명, 전체 체크, 약관 행 3개, 권한 안내 제목·목록, 시작하기 버튼의 위치와 크기를 Figma 값(상태 바 62px 제외)과 대조해 일치함. 체크한 뒤 모양(색·눌림)은 `Label`·`TermsLabel` spec에서 확인한 값을 그대로 쓰며 이 화면에서 따로 측정하지 않았다. 실기기와 픽셀 비교는 하지 못함

## 확인할 항목

- 프로필 화면 경로 (미정): 이동 대상인 프로필 작성 화면(`/signup/profile`)은 #63에서 만든다. 경로 상수는 이동을 연결할 때 `constants/paths.ts`에 추가한다.
- 비활성 시작하기의 이유 (기획·디자인 확인): 비활성 버튼은 `disabled`라 키보드 순서에서 빠지고 스크린 리더에는 이유가 전달되지 않는다(체크 항목 이름의 「[필수]」로 추론만 가능). Figma에 안내 문구가 없어 만들지 않았다. 문구(예: 필수 약관에 모두 동의하면 시작할 수 있어요)를 정하면 버튼 위에 두고 `aria-describedby`로 잇는다.
- 시작하기 동작 (미연결): 저장 성공 → 사진·카메라·알림 권한 요청 → 프로필로 이동하는 흐름은 인증 BFF·bridge가 없어 만들지 않았다. 지금은 체크하면 버튼이 활성화되지만 눌러도 반응이 없다. 노출 전에 연결하거나 route를 노출하지 않는다.
- 버튼 이름 (기획 확인): 기능명세서 1.3.1은 「동의 완료」, 1.3.4는 「시작하기」인데 Figma는 「시작하기」라서 Figma를 따랐다.
- 뒤로 가기 (기획 확인): Figma는 이전 화면으로 이동이고 기능 spec은 로그인 화면(로그인 해제)이다. 지금은 `router.back()`이며 직접 URL로 들어와 기록이 없으면 동작하지 않는다.
- 헤더 뒤로 가기 아이콘 색 (확정, 디자인 확인): Figma의 약관 동의·약관 원문·프로필 작성 헤더는 모두 `#bcbec2`(`icon-quaternary`)여서(렌더 픽셀로 3곳 모두 확인) `SignupFrame`이 `HeaderIconButton`의 `tone="subtle"`로 맞췄다. 온보딩 화면의 헤더 버튼은 기본(진한 색)이다. 이 색은 흰 배경 대비가 약 1.8:1이라 눌러야 하는 아이콘으로는 보이기 어려워 디자이너 확인이 필요하다.
- 제목·권한 안내 제목 색 (제안): Figma는 `black`(변수 없음)이고 구현은 `text-primary`(#121212)다.
- 접근 조건 (미정): 가입 중인 사용자만 진입하는지, 이미 동의한 사용자는 건너뛰는지는 인증 BFF가 정해진 뒤 연결한다.
- 체크 상태 보관 (결정): 새로고침하면 체크가 사라진다. 서버·저장소에 두지 않는다.
- 약관 이름 표기 (제안): 「필수 항목 모두 체크하기」는 기획의 「전체 동의」에 해당하는 Figma 문구이고, 「[필수]」는 약관 3개가 모두 필수라서 붙였다.
