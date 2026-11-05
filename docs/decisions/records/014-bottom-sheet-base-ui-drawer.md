# 014: 바텀시트의 모달 동작은 Base UI Drawer에 맡긴다

- 상태: accepted
- 구현 상태: 로컬 구현·검증. iOS WebView·VoiceOver 실기기 미검증.

## 배경과 결정

Figma Bottom Sheet(`2500:50688`)의 8개 변형은 내용이 서로 다르다(사진 올리기, 날짜 바꾸기, 번치 전환, 신고 사유 등). 그래도 모두 손잡이·제목·본문·하단 버튼으로 된 같은 틀을 쓴다. 포커스 가두기·복원, 배경 스크롤 잠금, ESC, 아래로 끌어 닫기, 입력 칸이 있는 시트의 가상 키보드 처리가 필요하다.

ADR 009의 재검토 조건("바텀시트는 Base UI Drawer부터 검토")에 따라 `@base-ui/react` 1.9.0의 Drawer를 내부 구현으로 사용한다. 공개 API는 디자인 시스템 `web` 구역의 Compound 부품 `BottomSheet`(Root·Content·Header·Title·Description·Close·Body·Footer)다. Base UI 타입은 노출하지 않는다. apps/web 모바일 화면에서만 쓰므로 `web` 구역에 둔다(ADR 010).

- `open/onOpenChange` controlled 전용.
- Figma에 그려진 시트 8개(Bottom Sheet 01~08)는 시트 렌더러 7개(`PhotoUploadSheet` 등, 07·08은 `ReportSheet` 하나)로 `web/bottomSheet/renderers/`에 모은다. 렌더러는 `BottomSheet`를 조합하고 문구·목록·콜백만 props로 받는다. 틀과 렌더러를 한 폴더에 두는 것은 `Dialog`·`ConfirmDialog`와 같은 배치다. 렌더러마다 폴더를 만들면 `web/` 바로 아래 폴더가 7개 늘어 찾기 어려워진다.
- 앱 `features`는 `overlay-kit`의 `overlay.open`으로 렌더러를 여는 hook을 만들고, 데이터와 동작(저장·이동·토스트)을 연결한다.
- 렌더러를 `features`에 두지 않는 이유: `apps/web`에는 Storybook이 없어 Figma 대조를 디자인 시스템 story에서 해야 한다. 더보기·신고·번치 전환 시트는 여러 기능이 쓰는데 `features`끼리는 서로 import할 수 없다.
- `type` prop 하나로 시트를 고르는 단일 컴포넌트는 택하지 않았다. 7개 시트의 props가 union 하나에 몰리고 시트 하나를 고칠 때마다 중앙 파일을 건드리게 된다.
- 바깥 터치·ESC·끌어내리기·닫기 버튼으로 닫는다. 입력 중인 시트는 `disablePointerDismissal`로 바깥 터치만 막는다.
- 열기·닫기 모션은 Figma 공통 모션 값을 쓴다(`docs/architecture/motion.md`).

## 비교한 대안

- plainsheet: 루트가 `<dialog>`지만 `showModal()`을 부르지 않아 뒤 화면이 inert가 되지 않는다. Esc는 끌기가 켜졌을 때만 등록하고, 가상 키보드 처리가 없다. 1.0.1(2026-02-08) 이후 배포가 없고 유지보수자가 한 명이다. 새 의존성이 하나 늘어난다. 소스를 읽어 비교했고 실제로 돌려 보지는 않았다.
- Base UI Drawer: 이미 Dialog 때문에 설치한 같은 패키지라 의존성이 늘지 않는다. Dialog와 같은 모달 기반(포커스 가두기, 바깥 inert, 스크롤 잠금)을 공유하므로 열린 모달과 Toast의 관계도 ADR 009와 같다. Drawer는 다음을 제공한다: 끌기(`--drawer-swipe-movement-y`), snap point, `VirtualKeyboardProvider`, 닫힘 사유(`swipe`, `closeWatcher` 등).
- 직접 구현: 끌기 속도 판정·스크롤과 끌기 구분·키보드 보정을 직접 유지해야 한다.

## 사용 제약

- 열린 시트 안에서는 Tab이 시트 내부로 순환한다. ADR 009와 같이 시트 안의 오류·필수 안내는 본문에 표시하고 액션 Toast는 시트를 닫은 뒤 띄운다.
- 화면에 제목이 없는 시트도 접근성 이름을 위해 `Title`을 숨김 처리해 둔다.

## 재검토 조건과 근거

iOS WKWebView에서 끌기와 스크롤이 충돌하거나 가상 키보드 보정이 맞지 않으면 재검토한다. Figma에 snap point나 중첩 시트가 생기면 같은 Drawer에서 부품을 늘린다.

- [Base UI Drawer](https://base-ui.com/react/components/drawer)
- [Apple Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
