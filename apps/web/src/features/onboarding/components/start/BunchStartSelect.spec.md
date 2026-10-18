# 페이지: 번치 시작 선택

## 메타데이터

- Route: `/onboarding`(`apps/web/src/app/(app)/onboarding/page.tsx`)
- Status: UI 구현됨(Storybook이 아니라 `next build` 결과를 Figma 값과 측정으로 대조함. 실기기 검증 전). 이동 연결과 닫기 동작은 일부만 연결
- 디자인 출처: Figma `Bunch/Create/Entry`(node `791:5604`). 화면설계서는 `온보딩_01`(node `791:7675`).

## 목적과 범위

### 포함

- 회원가입을 마친 사용자가 번치를 새로 만들지, 초대받은 번치에 참여할지 고르는 시작 화면의 UI.
- 구성: 헤더(왼쪽 닫기 X), 제목 「본격적으로 번치를 시작해볼까요?」, 시작 방식 카드 2개(`CreateBunchCard`).
- 카드를 누르면 각 흐름의 첫 단계 경로로 `router.push`한다(`constants/paths.ts`).

### 범위 외

- 이동 대상 화면(번치 만들기 첫 단계, 초대 링크 입력)과 API 연결.
- 닫기(X)의 확인 모달과 도착지(피드). 피드 화면이 없고 모달 문구가 정해지지 않아 연결하지 않았다.
- 로그인 도착지 판단(`docs/specs/login-signup.md` 1.2.8)과 이 화면으로의 진입 연결.
- 화면 전환 애니메이션 중 「새 번치 만들기」 → 번치 만들기 1단계 Slide In(왼쪽 방향, 200ms)은 구현했다(아래 확인할 항목). 「초대받은 번치 참여하기」는 도착 화면이 없어 연결하지 않았다.
- iPhone 상태 바·홈 인디케이터. 기기 요소라 웹이 그리지 않는다(Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/onboarding`. params와 search는 없다.
- 접근 권한·guard: 아직 없다. 로그인·가입 완료 여부를 막는 guard가 구현되지 않았다(`features/auth`는 빈 폴더). 가입을 마친 사용자만 오는 화면이라는 규칙은 확인할 항목이다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 카드는 `router.push`로 이동하고 redirect는 없다.

## 상태와 흐름

- 초기 진입: 정적 화면이다. 데이터 요청이 없다.
- Loading·Empty·Error·retry: 해당 없음(요청이 없다).
- Disabled·invalid: 없다.
- Success·완료 후 이동: 새 번치 만들기 → `/onboarding/create`, 초대받은 번치 참여하기 → `/onboarding/join`. 두 경로는 임시이며 아직 route가 없어 이동하면 404가 나온다.

## 데이터 의존성

- Query와 enabled 조건: 없음.
- Mutation·cache 영향: 없음.
- API 계약 확인 항목: 없음.

## UI와 접근성

- Component mapping:
  - 헤더: `core`의 `Header`(`leading`에 닫기 버튼). 닫기 버튼은 `LineCloseLargeIcon` 24px이고 터치 영역은 Large 기준 40px로 두었다(`design-system-icons.md`). 아이콘이 Figma 위치(왼쪽 16px)에 오도록 `-ml-s4`로 맞췄다.
  - 제목: 이 화면 전용 `h1`(Title-1-Bold 24/31). `PageHeader`는 22px SemiBold라 Figma와 달라 쓰지 않았다. 「본격적으로」 뒤에서 줄을 나눈다.
  - 카드: `web`의 `CreateBunchCard` 2개. 문구와 이동은 이 feature가 붙인다(DS는 문구·route를 모른다).
- Keyboard·focus·accessible name: 닫기 버튼 이름은 「닫기」이고 카드 이름은 제목과 설명이다. 카드는 button이라 Tab·Enter·Space로 누른다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 카드 폭은 `w-full`이고 화면 좌우 16px이다. 390px와 375px에서 가로 넘침이 없다. 카드 문구가 길어지면 카드가 늘어난다(`CreateBunchCard` spec).

| Figma     | 값                                 | 사용한 토큰·utility                           |
| --------- | ---------------------------------- | --------------------------------------------- |
| 헤더      | 높이 48, 좌우 16                   | `Header`(`h-s18 px-padding-p8`)               |
| 제목      | Title-1-Bold 24/31, 위 12, 좌우 16 | `typography-title-1-bold pt-s6 px-padding-p8` |
| 카드 영역 | 제목 아래 96, 좌우 16, 카드 간격 8 | `pt-s25 px-padding-p8 gap-s4`                 |
| 카드      | 343×170, radius 12                 | `CreateBunchCard`                             |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 `/onboarding`이 정적 페이지로 생성되고 `next start`로 직접 URL 200 응답만 확인함. 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증, 확인할 항목)
- [x] 상태별 UI: 정적 화면이라 상태가 없다
- [x] 관련 test: `BunchStartSelect.test.tsx`(제목·main, 닫기, 카드 이름, 두 카드의 이동 경로)
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 헤더·제목·카드 위치와 크기, 제목 글자 크기·굵기를 Figma와 대조(상태 바 44px 제외). 실기기와 픽셀 비교는 하지 못함

## 확인할 항목

- 노출 전 선행 조건 (확정 필요): 「새 번치 만들기」는 이제 1→2→3단계와 완료 화면까지 이어지지만 번치 생성 요청이 없어, 완료 화면이 실제로 만들어지지 않았는데 뜨는 거짓 성공 흐름이다. 「초대받은 번치 참여하기」(`/onboarding/join`)는 404이고 닫기(X)는 동작이 없다. UT·배포에 노출하기 전에 생성 요청과 참여 화면·닫기 처리를 연결하거나 이 route를 노출하지 않는다. 연결 전에 develop에 머지하면 PR 본문에 이 상태를 알린다.
- 다음 화면 경로 (제안): `/onboarding/create`, `/onboarding/join`은 임시다. 해당 화면을 만들 때 확정하고 `paths.ts`를 맞춘다.
- 닫기(X) (미정): 화면설계서는 "확인 모달을 띄운 뒤 피드로 이동"이다. 피드가 UT 이후라 도착지가 없고 모달 문구도 없다. 지금 닫기 버튼은 모양만 있고 눌러도 동작이 없다. 함수 prop을 받으면 `'use client'` 진입 컴포넌트의 직렬화 경고(Next TS 플러그인)가 나서 prop은 두지 않았고, 연결할 때 이 컴포넌트 안에서 모달과 이동을 처리한다.
- 접근 조건 (미정): 가입을 마친 로그인 사용자만 진입하는지, 아닌 사용자는 어디로 보내는지.
- 제목 색 (제안): Figma는 `black`(변수 없음)이고 구현은 토큰 `text-primary`(#121212)다. 디자이너 확인.
- 두 번째 카드 아이콘 (확정 필요): 「초대받은 번치 참여하기」도 Edit 아이콘이다. 의도인지 디자이너 확인.
- 웹 앱의 디자인 시스템 사용 (결정): 이 화면이 `apps/web`의 첫 디자인 시스템 소비다. `globals.css`에 디자인 시스템 소스를 Tailwind `@source`로 등록했다(`docs/decisions/records/008-toast-sonner.md`의 제약). `transpilePackages` 없이 빌드가 통과했다.
- 화면 전환: SSGOI `slide`로 새 화면은 오른쪽에서 들어오고 기존 화면은 왼쪽으로 화면 폭만큼 밀린다. Ease Out·이동 시간 200ms이며 첫 진입과 동작 줄이기 설정에서는 움직이지 않는다. 경로·시간·종료 판정·검증 범위는 `docs/architecture/motion.md`의 페이지 전환을 따른다. 참여 route는 아직 없어 해당 경로의 시각 전환은 미검증이다.
- 진행바 전환 방식 (결정): 헤더와 진행 표시줄을 단계 공통 틀(`CreateBunchFrame`, `create/(steps)/layout.tsx`)로 올려 단계 route가 바뀌어도 같은 요소가 남게 했고, 막대 색은 `Stepper`의 `transition-colors`(300ms ease-out)로 이어서 바뀐다. 현재 단계는 주소 조각(`description`·`mood`)으로 정한다. 완료 화면은 이 틀 밖이다(`create/complete`). 진행 표시줄은 본문 스크롤 밖에 고정된다(이전에는 제목과 함께 스크롤됐다). 페이지 전환 방식을 정할 때 이 구조를 유지할지 함께 판단한다.
- 뒤로 가기 후 모달 (미검증): 모달을 연 채 브라우저 뒤로 가기를 하면 단계 화면은 바뀌는데 모달은 `OverlayProvider`에 남을 수 있다. 「나가기」로 이동한 뒤 브라우저 뒤로 가기로 이전 단계에 돌아오면 입력이 비어 있다.
