# 컴포넌트: PlacePickSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: `5367:112296`, 기능명세 `docs/specs/feed.md` 6.3.1

## 목적과 범위

- 번들의 장소를 골라 콕하는 시트. 「어느 장소를 콕할까요?」, `PlacePickItem` 목록, 「취소」.
- 담기, 콕 취소 확인 창, 소속 번치 없음 안내는 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `places`: `id`, `name`, `address?`, `picked` 목록. `onPick(id)`: 버튼을 눌렀을 때. 시트는 닫지 않는다.

## 접근성

- 제목이 시트 이름. 줄마다 같은 글자의 버튼은 `PlacePickItem`이 장소 이름을 설명으로 붙여 구분한다.

## Styling과 의존성

- Figma 값: 제목 `heading-1-semibold` `text-secondary`, 줄 높이 68, 버튼 아래는 `BottomSheet` 기본값.

## 검증

- [x] test 2개: 목록과 담긴 상태, 누름 알림과 닫지 않음, 취소
- [x] Story: Default, SinglePlace
