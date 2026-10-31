# 016: 사진을 끌어 날짜 섹션을 옮기는 동작은 @dnd-kit(core·sortable)으로 처리한다

- 상태: accepted
- 구현 상태(2026-10-31 확인): 구현됨(`features/photo-box/components/PhotoDragArea.tsx`). headless Chrome에서 마우스 길게 누르기 → 끌기 → 놓기 → 되돌리기를 확인했고 터치·iOS·안드로이드 쉘 실기기는 미확인.

## 배경

선택 모드에서 사진 한 장을 길게 눌러 다른 날짜 섹션의 사진 사이로 끌어 옮긴다(기능 spec 3.4.2, 이슈 #127). 끄는 사진은 반투명하고 주변 사진이 비켜 들어갈 자리를 보여 주며, 화면 위·아래 끝에서 자동 스크롤하고, 길게 누르기와 스크롤이 충돌하지 않아야 한다. WebView 터치에서도 동작해야 한다.

## 결정

`@dnd-kit/core`(6.3.1)와 `@dnd-kit/sortable`(10.0.0), 두 패키지가 peer로 요구하는 `@dnd-kit/utilities`(3.2.2)를 `apps/web`의 `dependencies`에 추가한다. `MouseSensor`·`TouchSensor`에 지연 활성화(300ms, 이동 허용 8px)를 주어 길게 눌러야 끌기가 시작되고 그 전의 움직임은 스크롤로 넘긴다. 섹션마다 `SortableContext`를, 섹션 영역 전체에 `useDroppable`을 두고 끄는 동안의 섹션별 순서는 우리가 미리보기 상태로 계산한다(`lib/photoDrag.ts`).

- 길게 누르기 시작, 여러 컨테이너 사이 이동, 자동 스크롤, 드래그 오버레이를 라이브러리가 제공한다.
- 안정판(classic)이고 접근성 알림(live region)을 내장한다. 키보드 센서는 쓰지 않는다. 같은 결과를 내는 대체 경로는 날짜 바꾸기 시트다.

## 검토한 대안

- **`@dnd-kit/react`**: 새 API지만 0.x라 안정성을 확신할 수 없다.
- **`@hello-pangea/dnd`**: 세로 목록 중심이라 3열 격자와 섹션 사이 이동에 맞지 않는다.
- **`pragmatic-drag-and-drop`**: HTML5 DnD 기반이라 터치 WebView에서 불리하다.
- **직접 구현**: 의존성이 없지만 길게 누르기와 스크롤 충돌, 자동 스크롤, 격자 재배치를 모두 만들어야 한다.

## 영향

- 번들: 사진함 route에만 들어간다. 정확한 증가량은 측정하지 않았다.
- 접근성: 라이브러리가 만드는 알림 영역은 `role=status`·`aria-live=assertive`라 테스트에서 사진함 상태 안내와 구분해 조회해야 한다.
- 제약: classic은 유지보수가 느려진 상태다. 대체가 필요하면 끌기 영역이 `PhotoDragArea`와 `PhotoGrid` 두 곳에 모여 있다.
- 라이선스: MIT.

## 검증 / 후속 작업

1. 실기기(iOS·안드로이드 쉘)에서 길게 누르기와 스크롤 충돌, 자동 스크롤 체감, iOS 길게 누름 메뉴 억제를 확인한다.
2. 앱의 실제 번들 증가량을 측정한다.
