# 컴포넌트: BundleRecommendSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: `5664:100243`·`5664:100535`, 빈 상태 `4744:89611`(이전 시안 Bottom Sheet 03 `2487:46354`), 기능명세 `docs/specs/bundle-create.md` 4.2.1~4.2.4

## 목적과 범위

- 추천 번들 목록 시트. 회색 배경 위 `SuggestedBundleCard` 목록.
- 추천 계산, 카드를 눌렀을 때의 적용, 상세 화면은 번들 만들기 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `bundles`: `id`와 `SuggestedBundleCard` 표시 값(`imageSrc`, `title`, `members`, `photoCount`, `month`, `day`) 목록.
- `selectedId?`, `onSelect(id)`: 카드 선택. 선택 상태 보관은 호출자 담당.
- `onOpenDetail(id)`: 카드 오른쪽 화살표. 화살표가 항상 보여서 필수다.
- `maxVisibleMembers?`: 카드의 멤버 칩 최대 개수.
- `emptyLabel`, `emptyTitle`, `emptyDescription`: 추천이 없을 때 시트 이름(보이지 않음)과 문구.

## 상태와 동작

- 목록이 길면 본문만 스크롤한다. 제목은 고정.
- 바깥 터치·끌기·ESC·숨긴 닫기 버튼으로 닫는다. 닫아도 화면의 선택은 호출자가 그대로 둔다.
- 추천이 없으면 제목 없이 빈 상태 문구만 가운데에 보인다.

## 접근성

- 제목(2줄)이 시트 이름. 카드 접근성은 `SuggestedBundleCard` spec을 따른다.

## Styling과 의존성

- 배경 `surface-secondary`, 거의 전체 높이, 카드 사이 14(`gap-s7`).

## 확인할 항목

## 검증

- [x] test: 카드 목록, 카드 선택 시 id 전달, 빈 상태
- [x] Story: Default, ManyBundles, Empty
