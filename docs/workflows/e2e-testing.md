# E2E Testing

Playwright는 재사용 package가 아니라 repository test harness로 `e2e/`에서 관리한다.

## Current coverage

| Surface   | Project               | Spec location              | Current scope                                                                                                                                                                                                                                  |
| --------- | --------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin     | `admin-chromium`      | `e2e/admin/*.spec.ts`      | root route smoke                                                                                                                                                                                                                               |
| web       | `web-chromium`        | `e2e/web/*.spec.ts`        | 하단 탭 이동(`main-flow`), 초대 링크 참여·보관된 초대(`invite`), 번치 만들기·전환(`bunch`), 피드 좋아요·댓글(`feed`), 프로필 수정(`my`), 가입·비로그인·로그아웃(`auth`), 주요 화면 axe 자동 검사(`a11y`). 흐름별 기록은 아래 「Coverage 기록」 |
| web(운영) | `production-chromium` | `e2e/production/*.spec.ts` | `E2E_BASE_URL`을 줄 때만. 비로그인 가드(인트로·로그인 이동)와 실서버 세션 확인, 없는 초대 링크                                                                                                                                                 |

## Commands

```bash
yarn e2e:install
yarn e2e:typecheck
yarn e2e
yarn e2e:ui
yarn e2e:report
```

CI(`e2e.yml`)는 브라우저가 든 Playwright 공식 이미지에서 `yarn install` → `yarn e2e:typecheck` → `yarn e2e` 순으로 실행한다(브라우저 설치 단계 없음).

`playwright.config.ts`가 admin dev server를 `127.0.0.1:5173`에서 시작하거나 재사용한다. `--strictPort`로 포트 fallback을 막아, 다른 프로세스가 이미 그 포트를 쓰고 있으면 조용히 다른 포트로 옮겨가 엉뚱한 인스턴스를 테스트하는 대신 즉시 실패하게 한다.

web은 `NEXT_PUBLIC_API_MOCKING=enabled`로 운영 빌드(`yarn workspace @app/web build` → `next start`)를 `127.0.0.1:3200`에 띄워, 실제 백엔드 없이 MSW 가짜 서버로 화면 흐름만 확인한다(`Pixel 7` 기기 설정). dev 서버는 화면을 처음 열 때 컴파일하면서 페이지를 새로 불러와 메모리 상태(번치 만들기 입력 초안 등)가 사라지고 느렸다(2026-11-16 로컬: dev 6분·실패 2개·불안정 1개, 운영 빌드 23초·22개 통과). 빌드에 1~2분이 더 들고 Sentry 업로드는 끈다. 이미 떠 있는 서버는 MSW가 켜졌는지 알 수 없어 재사용하지 않으므로, 그 포트를 다른 프로세스가 쓰고 있으면 실패한다.

### 가짜 서버의 시작 세션 고르기

가짜 DB는 테스트마다 새 브라우저 context라 시작 데이터(`apps/web/src/mocks/db/seed.ts`)에서 시작한다. 기본은 가입을 마친 시연 사용자다. 다른 세션으로 시작하려면 첫 이동 전에 `localStorage['bunch:mock-session']`을 넣는다.

```ts
await page.addInitScript(() => localStorage.setItem('bunch:mock-session', 'anonymous'));
```

- `anonymous`: 비로그인. 인트로를 건너뛰려면 `bunch:intro-seen`을 `'1'`로 함께 넣는다.
- `signup-terms`: 약관 동의 전 가입 중이고 소속 번치가 없다. 가입을 마치면 번치 시작(`/onboarding`)으로 간다.
- 이 값은 저장된 가짜 DB가 없을 때만 읽는다. 같은 context에서 바꾸려면 IndexedDB를 지워야 한다.

### 운영 주소 스모크

`E2E_BASE_URL`을 주면 dev 서버를 띄우지 않고 그 주소에서 `production-chromium` 프로젝트(`e2e/production`)만 실행한다. 가짜 서버(MSW) E2E가 잡지 못하는 실서버·BFF·접근 가드 연결을 확인하려는 것이다. 배포가 성공하면 `e2e-production.yml`이 운영 주소로 실행한다.

```bash
E2E_BASE_URL=https://app.bunch.kr yarn e2e
```

- 로그인 없이 읽기만 하고 운영 데이터를 바꾸지 않는다. 로그인 뒤 화면은 테스트용 로그인 방법을 백엔드와 정한 뒤 추가한다(#413).
- 2026-11-16 로컬에서 운영 주소로 3개 모두 통과(16.9초).

## Writing tests

- locator는 `getByRole`, `getByLabel`, `getByText`, `getByTestId` 순으로 사용한다.
- `data-testid`는 접근 가능한 이름이나 role로 안정적으로 찾을 수 없을 때만 추가한다.
- route guard, navigation, API cache와 mutation 이후 이동처럼 단위 테스트로 증명하기 어려운 핵심 흐름을 우선한다.
- 임의의 sleep이나 retry 증가로 flaky test를 숨기지 않는다. selector, server startup, 비동기 상태 중 원인을 먼저 분류한다. 예외는 접근 가드 밖이라 hydration 전에 그려지는 화면(초대 진입)의 첫 클릭이다. 그 전 클릭은 무시되므로 결과가 보일 때까지 다시 누르되 클릭과 재시도에 시간 상한을 둔다(`e2e/web/invite.spec.ts`의 `clickUntil`).
- CI는 워커 2개·재시도 1회다(`playwright.config.ts`). 러너 4코어에서 admin dev 서버·web 운영 서버와 함께 돌릴 수 있는 수이고, 재시도는 한 번의 일시 실패만 넘겨 불안정한 테스트가 숨지 않게 한다(2026-11-13 로컬 `CI=1`: 워커 1·재시도 2 36.7초 → 워커 2·재시도 1 26.0초, 7개 모두 통과). 워커가 둘이라 spec이 동시에 돌므로, 테스트끼리 가짜 서버 데이터를 공유하지 않게 각 테스트가 자기 데이터를 준비한다.
- 앱 WebView의 iOS 엔진은 WebKit이다. web E2E를 추가할 때는 Chromium 외에 WebKit 모바일 project를 포함할지 검토한다. 특정 브라우저에서만 실패하면 flaky로 단정하지 않고 trace의 스크린샷과 page snapshot부터 확인한다. 다른 프로젝트에서는 mutation 직후 navigate의 cache 레이스가 WebKit에서만 재현됐고, timeout을 늘려서는 풀리지 않았다(`docs/architecture/data-layer.md`).
- 인증이 필요 없는 핵심 화면에는 `@axe-core/playwright` 같은 자동 접근성 검사를 smoke에 더할 수 있다. 알려진 대비 예외를 뺀 모든 위반 0(impact 무관)을 기준으로 삼되, 자동 검사는 수동 접근성 확인을 대체하지 않는다.
- Playwright의 auto-wait와 `expect`의 관찰 조건을 사용하고, 고정 시간 대기는 추가하지 않는다.
- test data, 인증, 외부 API, cleanup 방식이 필요한 흐름은 spec의 전제로 명시한다. 개인 credential이나 실제 운영 데이터를 사용하지 않는다.

## Coverage 기록

핵심 흐름이 생기면 spec마다 아래를 기록한다.

| Spec        | 사용자 흐름                                                                                                                                              | 핵심 assertion                                                                                                                  | 의도적으로 제외한 범위                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `main-flow` | 하단 탭으로 번치·사진함·마이페이지 → 프로필 수정 진입                                                                                                    | 탭마다 주소와 h1                                                                                                                | 탭 화면의 내용                                             |
| `invite`    | `/invite/MOCKJOIN` → 초대장 확인 → 참여 → 완료 → 피드. 없는 링크. 보관된 초대의 우선순위(없음·있음·24시간 지남)                                          | 주소 이동, 초대 카드(여행가조), 참여 뒤 보관한 초대 삭제, 없는 링크의 토스트와 미보관, 보관된 초대가 있으면 `/`가 초대 확인으로 | 정원 초과·이미 참여·소속 10개, 비로그인 사용자의 초대 진입 |
| `bunch`     | 번치 만들기 중간 단계 직접 진입. 이름·공개 범위 → 소개 → 분위기 → 완료 → 피드. 번치 홈에서 퇴근런클럽으로 전환                                           | 첫 단계로 되돌림, 완료 화면의 이름, 피드 헤더의 현재 번치, 전환 뒤 h1·토스트·피드 현재 번치                                     | 번치 사진 변경·멤버 초대, 이름 중복, 새로고침 뒤 유지      |
| `feed`      | 피드 카드 → 번들 상세 → 좋아요·댓글 → 뒤로 가기                                                                                                          | 좋아요 버튼 이름의 수 +1, 등록한 댓글, 돌아온 카드의 좋아요 수                                                                  | 광고 카드, 답글·삭제·신고                                  |
| `my`        | 마이페이지 → 프로필 수정 → 닉네임 저장. 「중복」 닉네임                                                                                                  | 마이페이지 복귀·토스트·새 닉네임, 중복 오류 문구와 저장 버튼 비활성                                                             | 프로필 사진 변경                                           |
| `auth`      | 가입 중: `/` → 약관 전체 동의 → 프로필 → `/onboarding`, 약관 전 프로필 진입. 비로그인: 보호된 화면 → 인트로, 인트로를 봤으면 로그인. 마이페이지 로그아웃 | 가드가 보내는 주소, 로그인 화면의 소셜 버튼 3개                                                                                 | 실제 소셜 로그인, 인트로 애니메이션·가이드 넘기기          |
| `a11y`      | 번치 홈·사진함·마이페이지·프로필 수정·알림 설정                                                                                                          | axe 위반 0(WCAG 2.2 A·AA·best-practice, impact 무관, 알려진 대비 예외만 고정)                                                   | 키보드 동선·스크린 리더, 입력 오류·오버레이 상태           |

- 화면 간 navigation, route guard, mutation 후 이동처럼 unit test로 증명하기 어려운 흐름을 우선한다.
- screenshot 기반 검증을 추가할 때는 browser·viewport·font·data·animation을 고정할 수 있을 때만 사용한다. 기준 이미지 갱신 절차와 안정화 근거를 함께 남긴다.
