# 페이지: 번치 시작 선택

## 메타데이터

- Route: `/onboarding`(`apps/web/src/app/(app)/onboarding/page.tsx`)
- Status: UI 구현됨(Storybook이 아니라 `next build` 결과를 Figma 값과 측정으로 대조함. 실기기 검증 전). 닫기(X)는 첫 진입에서 중단 확인 모달을 연다
- 디자인 출처: Figma `Bunch/Create/Entry`(node `791:5604`). 화면설계서(node `791:7675`)를 함께 참고했다.

## 목적과 범위

### 포함

- 회원가입을 마친 사용자가 번치를 새로 만들지, 초대받은 번치에 참여할지 고르는 시작 화면의 UI.
- 구성: 헤더(왼쪽 닫기 X), 제목 「본격적으로 번치를 시작해볼까요?」, 시작 방식 사진 카드 2개(`EntryCard`).
- 카드를 누르면 각 흐름의 첫 단계 경로로 `router.push`한다(`constants/paths.ts`).

### 범위 외

- 이동 대상 화면(번치 만들기 첫 단계, 초대 링크 입력)과 API 연결.
- 피드 화면 자체(「나가기」가 이동하는 `ONBOARDING_PATHS.feed`는 피드 탭 `/feed`).
- 로그인 도착지 판단(`docs/specs/login-signup.md` 1.2.8)과 이 화면으로의 진입 연결.
- 화면 전환 애니메이션 중 「새 번치 만들기」 → 번치 만들기 1단계와 「초대받은 번치 참여하기」 → 참여 화면(`BunchJoin.spec.md`)의 Slide In(왼쪽 방향)은 구현했다(아래 확인할 항목).
- iPhone 상태 바·홈 인디케이터. 기기 요소라 웹이 그리지 않는다(Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/onboarding`. params와 search는 없다.
- 접근 권한·guard: `(app)` layout의 `AuthGate`가 서버의 가입 상태로 막는다(`features/auth/lib/accessPolicy.ts`, 결정 기록 019). 가입을 마친 사용자만 들어오고, 비로그인은 로그인(처음이면 인트로)으로, 가입 중이면 약관·프로필로 보낸다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 카드는 `router.push`로 이동하고 redirect는 없다.

## 상태와 흐름

- 초기 진입: 정적 화면이다. 데이터 요청이 없다.
- Loading·Empty·Error·retry: 해당 없음(요청이 없다).
- Disabled·invalid: 없다.
- Success·완료 후 이동: 새 번치 만들기 → `/onboarding/create`, 초대받은 번치 참여하기 → `/onboarding/join`. 두 route 모두 구현돼 있다(참여 화면은 `BunchJoin.spec.md`). 두 경로는 임시 값이다.

## 데이터 의존성

- Query와 enabled 조건: 없음.
- Mutation·cache 영향: 없음.
- API 계약 확인 항목: 없음.

## UI와 접근성

- Component mapping:
  - 헤더: `core`의 `Header`(`leading`에 닫기 버튼). 닫기 버튼은 `LineCloseLargeIcon` 24px이고 터치 영역은 Large 기준 40px로 두었다(`design-system-icons.md`). 아이콘이 Figma 위치(왼쪽 16px)에 오도록 `-ml-s4`로 맞췄다.
  - 제목: 이 화면 전용 `h1`(Title-1-Bold 24/31). `PageHeader`는 22px SemiBold라 Figma와 달라 쓰지 않았다. 「본격적으로」 뒤에서 줄을 나눈다.
  - 카드: `web`의 `EntryCard` 2개(사진은 `public/images/onboarding/`). 문구와 이동은 이 feature가 붙인다(DS는 문구·route를 모른다).
- Keyboard·focus·accessible name: 닫기 버튼 이름은 「닫기」이고 카드 이름은 제목과 설명이다. 카드는 button이라 Tab·Enter·Space로 누른다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 카드 폭은 `w-full`이고 화면 좌우 16px이다. 390px와 375px에서 가로 넘침이 없다. 카드 문구가 길어지면 카드가 늘어난다(`EntryCard` spec).

| Figma     | 값                                  | 사용한 토큰·utility                           |
| --------- | ----------------------------------- | --------------------------------------------- |
| 헤더      | 높이 48, 좌우 16                    | `Header`(`h-s18 px-padding-p8`)               |
| 제목      | Title-1-Bold 24/31, 위 12, 좌우 16  | `typography-title-1-bold pt-s6 px-padding-p8` |
| 카드 영역 | 제목 아래 36, 좌우 16, 카드 간격 13 | `pt-s15 px-padding-p8 gap-3.25`               |
| 카드      | 343×210, radius 16, 사진 배경       | `EntryCard`                                   |

## 모션

화면별 전환·모션의 결정과 확인 기록이다. 공용 규칙은 `docs/architecture/motion.md`를 따른다.

- 효과: 온보딩 시작 → 만들기·참여, 만들기 완료 → 초대는 `slide`를 사용한다. 새 화면은 오른쪽에서 들어오고 기존 화면은 왼쪽으로 화면 폭만큼 밀린다. 반대 이동은 방향을 뒤집는다. 페이드는 섞지 않고 경계 밖을 잘라낸다. 참여 화면의 시각 전환은 미검증이다.
- 시간·곡선: Slide In / Left. 설계서는 Ease In이었고 사용자 합의로 Ease Out 300ms를 썼다. 2026-11-25(#560)부터 다른 화면 이동과 같은 350ms·`cubic-bezier(0.4, 0, 0.2, 1)`(`cubicBezierIntegrator`)이며 근거는 [motion.md](../../../../../../../docs/architecture/motion.md) 「화면 이동 시간」이다. 실제 종료 시간은 브라우저 재검증 전이다.
- 상태 유지: 상위 layout은 provider만 유지한다. 실제 route의 DOM에 `data-ssgoi-transition`을 지정하고, 만들기 layout 내부에서 단계 묶음·완료·초대를 구분한다. URL을 먼저 감지하는 상위 경계에서 빈 화면이 전환되는 문제를 피하려고 콘텐츠와 경계를 함께 마운트한다. 1~3단계의 헤더·Stepper와 draft provider는 유지한다. 단계 사이의 본문 전환은 현재 등록하지 않았다.
- 번치 홈 「새로운 번치 추가하기」 → 이 화면(`axis` y)은 `docs/specs/bunch-home.md`의 「모션」에 있다.
- 프로필 작성 → 이 화면(가입 완료, `axis` z)은 `docs/specs/login-signup.md`의 「모션」에 있다.

## 검증

- [ ] direct URL·새로고침·뒤로 가기: 이전에 `next build`에서 정적 페이지로 생성되고 `next start`로 직접 URL 200 응답을 확인함. 지금은 `from` 쿼리를 읽어 요청마다 렌더되는 동적 route다. 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: `(app)` layout의 `AuthGate`가 맡는다(#259). 규칙은 `accessPolicy.test.ts`·`AuthGate.test.tsx`가 확인하고, 이 화면에서 직접 확인하지는 않음(미검증)
- [x] 상태별 UI: 정적 화면이라 상태가 없다
- [x] 관련 test: `BunchStartSelect.test.tsx`(제목·main, 첫 진입 닫기의 중단 확인 모달(열기·계속 만들기·ESC·나가기)·번치 홈 진입 닫기 뒤로 가기·기록 없을 때 대체 이동, 카드 이름, 두 카드의 이동 경로)
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 헤더·제목·카드 위치와 크기, 제목 글자 크기·굵기를 Figma와 대조(상태 바 44px 제외). 실기기와 픽셀 비교는 하지 못함

## 확인할 항목

- 노출 전 선행 조건 (확정 필요): 「새 번치 만들기」는 이제 1→2→3단계와 완료 화면까지 이어지지만 번치 생성 요청이 없어, 완료 화면이 실제로 만들어지지 않았는데 뜨는 거짓 성공 흐름이다. UT·배포에 노출하기 전에 생성 요청과 참여 화면을 연결하거나 이 route를 노출하지 않는다. 연결 전에 develop에 머지하면 PR 본문에 이 상태를 알린다.
- 다음 화면 경로 (제안): `/onboarding/create`, `/onboarding/join`은 임시다. 해당 화면을 만들 때 확정하고 `paths.ts`를 맞춘다.
- 닫기(X): 번치 홈 「새로운 번치 추가하기」로 들어온 경우(`/onboarding?from=bunch`, 번치 메인 화면설계서 8-1)는 `router.back()`으로 이전 화면에 돌아간다(`/bunch` 디졸브 150ms 규칙이 양방향). 이전 기록이 없으면(새 탭·직접 입력) `/bunch`로 `replace`한다. page가 쿼리를 검사해 도착 경로 문자열(`closeBackHref`)만 넘긴다(onboarding은 bunch-home을 import하지 않음). 다른 사이트에서 같은 탭으로 들어온 경우는 기록이 있어 `back()`이 그 사이트로 갈 수 있다.
- 첫 진입의 닫기(X) (구현): 번치 만들기 단계와 같은 중단 확인 모달(`ExitFlowDialog`, 「번치 만들기를 그만둘까요?」, 「나가기」·「계속 만들기」)을 연다. 「나가기」는 `ONBOARDING_PATHS.feed`로 `router.replace`한다. 설명은 기능명세 2.1.3(→2.2.11) 그대로 「지금 나가면 작성한 정보가 모두 사라지고 피드로 이동해요.」다(#452). 시작 화면에는 입력값이 없지만 명세 문구를 그대로 쓴다(확정, 사용자 결정 2026-11-19). 번치 홈에서 들어온 경우는 모달 없이 이전 화면으로 돌아간다.
- 접근 조건 (미정): 가입을 마친 로그인 사용자만 진입하는지, 아닌 사용자는 어디로 보내는지.
- 제목 색 (제안): Figma는 `black`(변수 없음)이고 구현은 토큰 `text-primary`(#121212)다. 디자이너 확인.
- 카드 문구·그래픽 (반영): Figma Entry Card 기준으로 「초대 받은 번치 참여하기」(띄어쓰기 포함)와 Create·Join 그래픽 2종을 반영했다. 배경 사진은 Figma 내보내기를 JPEG로 줄여 `public/images/onboarding/`에 두었다.
- 웹 앱의 디자인 시스템 사용 (결정): 이 화면이 `apps/web`의 첫 디자인 시스템 소비다. `globals.css`에 디자인 시스템 소스를 Tailwind `@source`로 등록했다(`docs/decisions/records/008-toast-sonner.md`의 제약). `transpilePackages` 없이 빌드가 통과했다.
- 화면 전환: SSGOI `slide`로 새 화면은 오른쪽에서 들어오고 기존 화면은 왼쪽으로 화면 폭만큼 밀린다. 이동 시간·곡선은 화면 이동 공통 350ms(#560)이며 첫 진입과 동작 줄이기 설정에서는 움직이지 않는다. 경로·시간·종료 판정·검증 범위는 `docs/architecture/motion.md`의 페이지 전환을 따른다. 참여 화면의 시각 전환은 미검증이다.
- 진행바 전환 방식 (결정): 헤더와 진행 표시줄을 단계 공통 틀(`CreateBunchFrame`, `create/(steps)/layout.tsx`)로 올려 단계 route가 바뀌어도 같은 요소가 남게 했고, 막대는 `Stepper`가 현재 단계의 막대만 채우고 새 막대가 왼쪽에서 오른쪽으로 600ms Slow 근사 곡선으로 늘어난다(`docs/architecture/motion.md`). 현재 단계는 주소 조각(`description`·`mood`)으로 정한다. 완료 화면은 이 틀 밖이다(`create/complete`). 진행 표시줄은 본문 스크롤 밖에 고정된다(이전에는 제목과 함께 스크롤됐다). 페이지 전환 방식을 정할 때 이 구조를 유지할지 함께 판단한다.
- 뒤로 가기 후 모달 (미검증): 모달을 연 채 브라우저 뒤로 가기를 하면 단계 화면은 바뀌는데 모달은 `OverlayProvider`에 남을 수 있다. 「나가기」로 이동한 뒤 브라우저 뒤로 가기로 이전 단계에 돌아오면 입력이 비어 있다.
