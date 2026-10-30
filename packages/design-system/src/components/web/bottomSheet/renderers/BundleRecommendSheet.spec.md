# 컴포넌트: BundleRecommendSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 03 `2487:46354`, 기능명세 `docs/specs/bundle-create.md` 4.2.1~4.2.4

## 목적과 범위

- 추천 번들 목록 시트. 회색 배경 위 `SuggestedBundleCard` 목록.
- 추천 계산, 선택 반영(「적용하기」), 상세 화면은 번들 만들기 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `bundles`: `id`와 `SuggestedBundleCard` 표시 값(`imageSrc`, `title`, `members`, `photoCount`, `month`, `day`) 목록.
- `selectedId?`, `onSelect(id)`: 카드 선택. 선택 상태 보관은 호출자 담당.
- `onOpenDetail?(id)`: 카드 오른쪽 화살표.

## 상태와 동작

- 목록이 길면 본문만 스크롤한다. 제목은 고정.
- 바깥 터치·끌기·ESC·숨긴 닫기 버튼으로 닫는다.

## 접근성

- 제목(2줄)이 시트 이름. 카드 접근성은 `SuggestedBundleCard` spec을 따른다.

## Styling과 의존성

- 배경 `surface-secondary`, 손잡이 아래 14(`pt-padding-p7`), 제목·카드·카드 사이 14(`gap-s7`).

## 확인할 항목

- 선택 반영 버튼 (미정): 기능명세는 「적용하기」로 선택을 반영하지만 Figma 03에는 버튼이 없다. 디자인 확인 후 `Footer`에 추가한다.
- 그림자 (제안): Figma 03에만 시트 그림자(`drop-shadow 13px 12%`)가 있다. 다른 변형과 맞춰 넣지 않았다.

## 검증

- [x] test 2개: 카드 목록, 카드 선택 시 id 전달
- [x] Story: Default, ManyBundles
