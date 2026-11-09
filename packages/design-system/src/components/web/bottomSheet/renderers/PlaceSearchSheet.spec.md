# 컴포넌트: PlaceSearchSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- 기능명세: `docs/specs/bundle-create.md` 4.3.10(위치). `LocationSearchSheet`(번들 feature)에서 화면 부분을 옮겼다

## 목적과 범위

- 장소를 키워드로 찾아 고르는 시트. 검색 입력란, 검색 전 안내, 결과, 결과 없음.
- 검색 요청, 늦은 응답 버리기, 실패 토스트, 열 때 초기화는 호출자가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- 문구: `title`(보이지 않음), `inputLabel`, `placeholder`, `guideTitle`, `guideDescription`, `noResultLabel`, `resultCountLabel(count)`.
- `results`: 검색 전 `undefined`, 검색 뒤 결과(`id`, `name`, `address`). `onSearch(keyword)`, `onSelect(place)`.

## 접근성

- 시트 이름은 보이지 않는 `title`. 결과 수와 결과 없음은 항상 있는 `role="status"` 영역에서 읽는다.
- 결과 줄은 버튼이다.
- 화면에 닫기 버튼이 없어 숨긴 닫기 버튼을 입력란 뒤에 둔다.

## Styling과 의존성

- 거의 전체 높이. 결과 줄의 구분선이 시트 양끝까지 닿게 본문 좌우 패딩을 없앴다.

## 검증

- [x] test 3개: 검색 전 안내, 결과 없음, 결과 선택
- [x] Story: Default, WithResults, NoResult
