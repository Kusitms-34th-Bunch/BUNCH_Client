# 라이브러리 선택 기준

구현하다가 아래 표의 요구를 만나면 직접 만들기 전에 이 문서를 먼저 본다. 이미 도입한 라이브러리가 그 요구를 맡고 있으면 그것을 쓰고, 경쟁 라이브러리를 새로 들이지 않는다. 후보 표의 라이브러리는 「언제 꺼내나」 조건이 실제로 생겼을 때 도입을 검토하며, 조건 없이 미리 설치하지 않는다.

도입 절차는 `docs/conventions/package-management.md`를 따른다. 실제로 도입하면 「도입한 것」 표로 옮기고, 방향을 제한하는 선택이면 `docs/decisions/records/`에 결정을 남긴다.

## 도입한 것

| 요구                                                                                      | 라이브러리                                     | 위치                | 기준 문서                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- | ----------------------------------------------- |
| 접근성 있는 overlay·입력 부품(대화상자, 시트)                                             | `@base-ui/react`                               | design-system       | ADR 009(Dialog), ADR 014(Drawer 바텀시트)       |
| 토스트                                                                                    | `sonner`                                       | design-system       | ADR 008                                         |
| 시트·대화상자 열기·결과 받기(상태 제어)                                                   | `overlay-kit`                                  | web                 | ADR 014, 시트 렌더러는 `overlay.open`으로 연다  |
| 끌어서 순서 바꾸기                                                                        | `@dnd-kit/core`·`sortable`                     | web                 | ADR 016                                         |
| 좌우로 넘기는 사진 보기                                                                   | `swiper`                                       | web                 | ADR 015                                         |
| 화면 전환                                                                                 | `@ssgoi/react`                                 | web                 | `docs/architecture/motion.md`, ADR 017          |
| 로티 애니메이션                                                                           | `lottie-react`(light 빌드)                     | web                 | `docs/architecture/motion.md`                   |
| 서버 상태                                                                                 | `@tanstack/react-query`                        | web                 | `docs/architecture/data-layer.md`               |
| 앱을 다시 열 때 지난 서버 상태 복원(쿼리 캐시 영속화, async storage persister 함께)       | `@tanstack/react-query-persist-client`         | web                 | `data-layer.md` 「캐시 영속화」                 |
| HTTP 요청                                                                                 | `ky`                                           | api-core·web        | `docs/architecture/api-boundary.md`             |
| 런타임 스키마 검증                                                                        | `zod`                                          | api-core·web·bridge | `docs/architecture/data-layer.md`               |
| 변형 있는 Tailwind class                                                                  | `tailwind-variants`(+`tailwind-merge`, `clsx`) | design-system       | `docs/architecture/design-system-components.md` |
| API 가짜 서버                                                                             | `msw`                                          | web(개발)           | ADR 007, `docs/workflows/testing.md`            |
| 화면 접근성 자동 검사(E2E 안에서 axe 실행)                                                | `@axe-core/playwright`                         | 루트(E2E)           | `docs/workflows/testing.md`                     |
| 번들 구성 분석(모듈별 크기, CI 번들 크기 보고의 원인 표)                                  | `@next/bundle-analyzer`                        | web(개발·CI 빌드)   | `docs/workflows/performance.md`                 |
| 오류 수집                                                                                 | `@sentry/nextjs`                               | web                 | ADR 006                                         |
| 제품 분석(클릭 흐름·막힌 지점, 녹화 없음)                                                 | `posthog-js`                                   | web                 | ADR 018                                         |
| web↔앱 통신                                                                               | `@webview-bridge/web`                          | web                 | `docs/architecture/mobile-shell.md`             |
| 앱 쉘에서 고른 사진 줄이기(웹이 직접 자를 원본 전달)                                      | `expo-image-manipulator`                       | mobile-shell        | `docs/architecture/mobile-shell.md`             |
| 브라우저·모바일 hook과 유틸(목록 끝 감지, 키보드 회피, 디바운스, 길게 누르기, ref 합치기) | `react-simplikit`                              | web·design-system   | 아래 「react-simplikit」                        |

## 후보 (조건이 생기면 검토)

| 요구                                                      | 후보                                            | 언제 꺼내나                                                                                                                                  | 도입 전 확인                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| route를 나누지 않는 다단계 흐름의 단계별 상태와 뒤로 가기 | `@use-funnel/next`                              | 한 화면(바텀시트 등) 안에서 3단계 이상 넘기는 흐름이 새로 생길 때. 단계마다 route가 있는 흐름은 쓰지 않음                                    | 아래 「다단계 흐름」                                                                             |
| Suspense·ErrorBoundary로 query를 선언형으로 읽기          | `@suspensive/react`·`@suspensive/react-query`   | 서버 데이터 연동(#199~)에서 화면이 Suspense 방식(`useSuspenseQuery`)을 쓰기로 해 로딩·오류·다시 시도 경계가 반복될 때(가장 먼저 검토할 후보) | `data-layer.md` 「Query 모드 선택」과 맞는지, React 19·TanStack Query v5·Next 16 호환            |
| 청크·그룹 같은 React 밖 범용 유틸                         | `es-toolkit`                                    | 같은 유틸을 두 곳 이상 직접 구현하게 될 때(한 번이면 직접 작성)                                                                              | 트리셰이킹, lodash 호환 필요 여부                                                                |
| 긴 목록·큰 표의 화면 밖 DOM 비용                          | `@tanstack/react-virtual` 또는 `react-virtuoso` | 측정으로 목록 렌더·스크롤 비용이 확인됐을 때(`docs/workflows/performance.md`)                                                                | 사진 격자처럼 끌기·선택과 함께 쓰는 목록에서의 동작                                              |
| 인증 번호 입력(한 칸씩 나뉜 코드)                         | `input-otp`                                     | 휴대폰·이메일 인증 화면이 생길 때                                                                                                            | 디자인 시스템 입력 부품과의 조합, iOS 자동 채우기                                                |
| 숫자가 바뀌는 애니메이션(개수·금액)                       | `@number-flow/react`                            | 디자인이 숫자 전환 모션을 요구할 때                                                                                                          | 동작 줄이기 대응, 번들 크기                                                                      |
| 차트                                                      | `recharts`                                      | 통계·대시보드 화면이 생길 때                                                                                                                 | 접근성(표 대체 제공), 번들 크기                                                                  |
| 파일 시스템을 쓰는 테스트의 임시 폴더                     | `fixture-kit`                                   | generator 산출물 테스트처럼 임시 폴더 정리가 반복될 때                                                                                       | Node 버전과 `await using` 지원                                                                   |
| Figma 아이콘을 repo로 내보내기                            | `icona`(`@icona/generator`)                     | 아이콘을 repo로 옮기는 수작업이 반복돼 번거로울 때                                                                                           | 지금 SVGR 파이프라인과 통일 여부, SVG 입력 검증 규칙(`docs/architecture/design-system-icons.md`) |
| 여러 `package.json` 정렬, 흩어진 설정 파일 합치기         | `packlint`, `pull-up`                           | package 수가 늘어 일관성이 깨질 때                                                                                                           | 유지보수 상태, Yarn 4 PnP 호환                                                                   |

후보에 없는 요구라면 직접 조사하고, 도입하면 위 표에 더한다. 상태 관리 라이브러리(`zustand` 등)는 서버 상태를 Query가, 화면 상태를 React가 맡는 지금 구조에서 필요하지 않다. 여러 화면이 함께 쓰는 클라이언트 상태가 실제로 생기면 그때 검토한다.

## react-simplikit

hook을 새로 만들기 전에 react-simplikit에 있는지 먼저 본다(2026-11-04 도입, 0.4.0, 런타임 의존성 없음). 예: cursor 무한 스크롤의 목록 끝 감지 `useIntersectionObserver`, WebView 키보드 회피 `useAvoidKeyboard`·`useVisualViewport`, `useDebouncedCallback`, `useLongPress`, `mergeRefs`. 0.x라 업그레이드할 때 변경 내역을 확인한다.

이미 직접 만든 아래 구현은 동작이 달라 바꾸지 않는다. 새 코드도 같은 동작이 필요하면 기존 구현을 재사용한다.

- 바깥 누르면 닫기(`PhotoActionMenu`, `DraftVisibility`): 누르는 순간(`pointerdown`) 닫고 같은 effect에서 Esc도 처리한다. `useOutsideClickEffect`는 손을 뗀 뒤(`click`)에 반응한다.
- 클라이언트 렌더 판단(`useBlockRelation`): `useSyncExternalStore`라 앱 안 이동으로 마운트될 때는 첫 렌더부터 참이다. `useIsClient`는 마운트마다 첫 렌더가 거짓이라 확인 중 화면이 한 번씩 깜빡인다.
- 동작 줄이기 구독(`shared/hooks/useReducedMotion`): react-simplikit에 없다.
- 입력칸을 키보드 위로 올리기(`shared/hooks/useScrollFocusedIntoView`): 포커스된 입력칸만 스크롤하는 용도라 화면 전체를 띄우는 `useAvoidKeyboard`와 목적이 다르다.
- 네트워크 상태(`features/bundle/hooks/useOnlineStatus`): `useSyncExternalStore`에 다시 확인(`recheck`)을 더했다. `useNetworkStatus`는 `useState`+`useEffect`다.
- 화면 가림 감지(`usePhotoReorder`, `NativeTabBarVisibility`): `visibilitychange`를 각자 effect 안에서 다른 처리와 함께 구독한다. 새로 필요하면 `usePageVisibility`·`useVisibilityEvent`를 먼저 본다.

## 직접 만들기 전에 잡을 것

- 토스트를 직접 만들거나 대화상자로 대신하기 → 디자인 시스템 `toast`(`sonner`).
- `div`로 만든 드롭다운·대화상자·시트에 포커스 처리를 직접 하기 → 디자인 시스템 `Dialog`·`BottomSheet`(`@base-ui/react`).
- 시트·대화상자 열림 상태를 화면 state로 두기 → `useScreenOverlay`(`overlay-kit`의 `overlay.open` 감싼 hook)로 열기. 이 hook은 다 닫히면 언마운트하고, 화면을 떠나면 열린 창을 지운다. 서버 상태로 저절로 뜨는 창(`DraftMissingGate`)은 사용자 동작으로 여는 창이 아니라 예외다.
- 끌기·스와이프를 pointer 이벤트로 직접 계산하기 → `@dnd-kit`·`swiper`.
- 숫자를 다시 렌더링해 바뀌는 모션 흉내 내기 → 후보 `@number-flow/react`.
- 1,000개 넘는 목록을 그대로 그리기 → 측정 뒤 후보 virtualization.
- `IntersectionObserver`·`visualViewport`·디바운스·길게 누르기를 effect로 직접 구현하기 → `react-simplikit`(위 「react-simplikit」의 기존 구현은 예외).
- 바깥 누르면 닫기를 새로 만들기 → 기존 메뉴와 같이 `pointerdown` 기준. `useOutsideClickEffect`(`click`)는 닫히는 시점이 달라 섞지 않는다.
- 조건이 세 겹인 템플릿 문자열 className → `cn`, 변형이면 `tv`(`tailwind-variants`).

## 다단계 흐름: use-funnel

여러 단계 흐름의 단계별 상태(context)와 뒤로 가기를 히스토리 기반으로 관리하는 React hook이다(`useFunnel<StepTypes>({ id, initial: { step, context } })`). 2026-10-11에 공식 문서(`use-funnel.slash.page`)와 npm을 읽었고(`@use-funnel/next` 0.0.23, `@use-funnel/browser` 0.0.17), 설치하지 않았다.

- 지금 흐름에 쓰지 않는 이유(2026-11-04 판단): 번치 만들기·가입·초대 참여는 단계마다 별도 route이고 입력은 route group 레이아웃의 Provider가 유지하며, 단계 사이 화면 전환(SSGOI)도 route 단위다(`docs/architecture/motion.md`). use-funnel은 한 페이지 안에서 단계를 히스토리 상태로 다루므로 도입하면 이 구조를 다시 짜야 하고, 지금 뒤로 가기·입력 유지 문제가 없어 바꿀 근거가 없다.
- 맞을 만한 곳: route를 나누지 않고 한 화면(바텀시트 등) 안에서 3단계 이상 넘기는 흐름.
- 도입 전 확인: Next.js App Router에서 쓰는 방법, 새로고침·직접 URL 진입 시 단계와 context 복원(`docs/architecture/web-interface-guidelines.md`의 URL 반영 규칙과 맞는지), 앱 쉘의 하드웨어·스와이프 뒤로 가기와 함께 동작하는지(실기기), 0.x라 API가 바뀔 수 있는 점, 번들 크기.
