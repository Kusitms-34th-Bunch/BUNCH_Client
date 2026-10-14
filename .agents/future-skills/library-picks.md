# 라이브러리 Lookup (비활성)

`pick-ui-library`와 같은 성격의 참고 자료다. 지금 설치하지 않고, 아래 요구가 실제로 생겼을 때만 참고한다. 설치 전에 `package.json`에 이미 경쟁 라이브러리가 있는지 먼저 확인하고, 있으면 교체보다 유지를 우선한다.

## 목록

| 요구                                                          | 후보                                           | 비고                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 범용 유틸 함수(debounce, chunk, pick 등)                      | `es-toolkit`                                   | lodash 대체, 트리쉐이킹 지원, `es-toolkit/compat`로 lodash API 호환 레이어 제공                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 모바일 대응 React hook(키보드 회피, safe area)                | `react-simplikit`                              | zero-dependency, SSR 호환, tree-shakeable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| overlay(모달·바텀시트·토스트) 상태 관리                       | `overlay-kit`                                  | `overlay.open()`/`overlay.openAsync()`로 선언적·promise 기반 제어. UI 자체는 그리지 않음                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Suspense·ErrorBoundary + TanStack Query 선언형                | `suspensive`                                   | `@suspensive/react-query`의 `SuspenseQuery`/`SuspenseInfiniteQuery`가 `data-layer.md`의 Suspense query 패턴과 직접 맞닿아 있다                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 다단계 흐름(온보딩·가입·생성 마법사)의 단계별 상태와 뒤로가기 | `@use-funnel/next`(web), `@use-funnel/browser` | 토스(Viva Republica) 오픈소스(MIT) `use-funnel`. 단계별 타입 안전한 context와 히스토리 기반 상태 관리. **0.x 버전**이라 API가 바뀔 수 있음. 아래 "다단계 흐름" 섹션 참고                                                                                                                                                                                                                                                                                                                                                                              |
| 파일시스템을 쓰는 테스트의 임시 디렉터리 관리                 | `fixture-kit`                                  | `await using`으로 자동 정리되는 temp 디렉터리. generator 산출물 테스트에 적합할 수 있음                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Figma 아이콘을 repo로 내보내고 컴포넌트로 생성                | `icona` (`daangn/icona`)                       | 당근 오픈소스(MIT). Figma 플러그인으로 `icona-frame`의 아이콘을 `icons.json` 하나로 GitHub에 내보내고, `@icona/generator`로 React 컴포넌트 등을 생성한다. 선택적으로 GitHub Actions 자동 생성. 지금은 아이콘이 0개라 비활성(`docs/architecture/design-system-icons.md`). 디자이너가 아이콘을 꾸준히 만들고 repo로 옮기는 수작업이 번거로워질 때 검토하고, 이미 준비한 SVGR 기반 생성 스크립트와 하나로 통일할지, SVG 입력 검증(`<script>`, `on*`, 외부 `href` 차단) 규칙과 어떻게 맞출지 확인한다. 최신 배포 상태와 Yarn 4 PnP 호환은 확인하지 못했다 |
| 모노레포에 흩어진 설정 파일(CODEOWNERS 등) 통합               | `pull-up`                                      | 패키지별로 설정을 나눠 관리하고 루트 파일로 합치고 싶을 때만. 각 패키지의 설정 파일(예: CODEOWNERS)을 모아 루트의 정해진 위치(`.github/CODEOWNERS`)에 생성하는 도구(`@pull-up/cli`, `pullup sync`/`check`, 설정은 루트 `pullup.yml`). 작은 레포(스타 14, 2026-10 확인)라 도입 전에 유지보수 상태와 Yarn 4 PnP 호환을 확인한다                                                                                                                                                                                                                         |
| 모노레포 여러 `package.json` 필드 정렬·표준화                 | `packlint`                                     | 지금 package.json 개수가 적어 우선순위 낮음. 수가 늘어나 일관성이 깨지면 재검토                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## 다단계 흐름: use-funnel (토스)

출처: `use-funnel.slash.page`, `github.com/toss/use-funnel`, npm 레지스트리를 2026-10-11에 읽은 내용이다(웹 요약으로 읽었으므로 도입 전에 공식 문서로 다시 확인한다). 설치하지 않았고 이 저장소의 `package.json`에는 funnel·stepper 계열 의존성이 없다.

**무엇인가**: 여러 단계로 이어지는 UI 흐름을 단계별 상태(context)와 히스토리 기반으로 관리하는 React hook 라이브러리다. 공식 소개는 "단계별 상태 관리", "히스토리별 상태 관리", "강력한 Type 지원"을 내세운다. 사용 형태는 `useFunnel<StepTypes>({ id, initial: { step, context } })`다.

**패키지** (레포 `packages/` 기준): `core`, `browser`, `next`, `react-router`, `react-router-dom`, `react-navigation-native`.

| 패키지                | 읽은 버전 (npm)     | peer                        |
| --------------------- | ------------------- | --------------------------- |
| `@use-funnel/next`    | 0.0.23 (2026-04-09) | `next >=12`, `react >=16.8` |
| `@use-funnel/browser` | 0.0.17 (2026-04-09) | `react >=16.8`              |

**이 저장소에서 맞을 만한 곳**

- web의 온보딩: 약관 → 프로필 → Bunch 생성 또는 초대 복귀(`docs/specs/bunch-prd.md` 6장 ① 구간). 단계가 3개 이상이고 뒤로가기와 단계별 입력 유지가 필요한 흐름이다.
- Bunch 생성, 사진 올리기처럼 단계가 이어지는 폼 흐름. 단계가 2개 안팎이면 라이브러리 없이 state나 URL로 충분하니 도입하지 않는다.
- WebView 쉘의 Android 하드웨어 뒤로가기와 iOS 스와이프 뒤로가기는 웹 history에 연결돼 있어서(`docs/architecture/mobile-shell.md`), 히스토리 기반 단계 관리와 같이 동작해야 한다. 실기기에서 확인한 적이 없다.

**도입 전에 확인할 것**

- Next.js App Router에서 쓰는 방법. 레포 README는 App Router와 Pages Router를 모두 지원한다고 소개하지만, 어떤 패키지를 어떻게 쓰는지는 읽은 자료에서 확인하지 못했다. 공식 문서와 우리 Next 버전으로 직접 확인한다.
- 새로고침과 직접 URL 진입 시 단계·context가 어떻게 복원되는지. 단계 상태가 히스토리에 담기는 방식이라 `docs/architecture/web-interface-guidelines.md`의 "뒤로가기·공유가 의미 있는 state는 URL에 반영" 규칙과 맞는지 본다.
- admin(Vite + TanStack Router)에는 전용 패키지가 없다(`react-router`, `react-router-dom`, `next`, `react-navigation-native`, `browser`뿐). `browser` 패키지가 TanStack Router와 충돌하는지는 확인하지 못했다. admin은 지금 보류 상태라 급하지 않다.
- 0.x 버전이라 API 변경 가능성이 있고, 주 사용자가 토스 내부라 우리 요구에 맞는 수정이 빨리 반영된다는 보장은 없다.
- 번들 크기와 의존성(`@use-funnel/core`)은 측정하지 않았다.

**결론**: 온보딩처럼 3단계 이상이고 뒤로가기가 중요한 흐름이 실제로 구현 단계에 오면 후보로 검토한다. 그 전에는 설치하지 않는다. 도입하면 `docs/architecture/`에 흐름 패턴을 적고 `docs/decisions/records/`에 결정을 남긴다.

## 바텀시트: 다른 overlay 채택 여부에 따라 갈린다

레이어가 다른 두 가지를 분리해서 고른다 — "UI 자체(DOM·ARIA·드래그·snap point)"와 "상태 제어(열림/닫힘, 결과 처리)".

**Base UI를 아직 아무 용도로도 쓰지 않는다 — 지금 이 저장소의 실제 상태.** 이 경우 바텀시트 하나 때문에 dialog·select·combobox까지 포함한 Base UI 전체를 끌어오는 건 과하다. **plainsheet**(7KB, zero-dependency, 바텀시트 전용, 키보드·포커스 관리 내장)가 지금 기준으로는 더 가벼운 기본값이다.

**Base UI를 dialog·select 같은 다른 overlay에 먼저 채택하게 되면** 그때는 얘기가 다르다. Base UI의 `Drawer`가 2026-03(v1.3.0)부터 snap points, swipe direction, 가상 키보드 대응을 네이티브로 지원하고 다른 Base UI overlay와 portal 시스템을 공유하므로, 이미 들여온 라이브러리로 바텀시트까지 통합하는 게 plainsheet를 별도로 추가하는 것보다 의존성이 하나 준다.

**상태 제어는 둘 중 뭘 고르든 공통이다.** `overlay-kit`은 UI를 그리지 않고 열림/닫힘과 결과를 promise로 다루는 레이어라, plainsheet 위에도 Base UI Drawer 위에도 그대로 얹을 수 있다.

vaul은 과거 shadcn/ui의 기본 선택이었지만 shadcn/ui 자체가 Base UI Drawer로 옮겨간 상태라 새로 고를 이유는 약하다.

**결론: 지금 당장 바텀시트가 필요하면 plainsheet + overlay-kit. Base UI를 다른 overlay 용도로 먼저 채택했다면 그때 재검토한다.**
