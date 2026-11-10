# 컴포넌트: PlacePickButton

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `PlacePick Item`(node `3583:71236`)과 `Ad Photo Card`(node `5367:126624`) 안의 `ChipButton` M(오른쪽 아이콘을 손가락 `hand-click`으로 바꾼 인스턴스)
- 기능 명세: `docs/specs/feed.md` 6.1.5·6.3.1
- 이슈: #261

## 목적과 범위

- 장소를 현재 번치의 콕한 장소에 담는 버튼. 담기 전 연한 회색 「콕하기」, 담긴 뒤 검은 「콕 했어요」.
- 장소 콕 항목(`PlacePickItem`)과 광고 사진 카드(`AdPhotoCard`)가 같이 쓴다.
- 담기·취소(콕 취소 확인 모달 포함), 연타 막기는 호출자가 한다.

## Public API

- Props: `picked`(필수), `label`(기본 「콕하기」), `pickedLabel`(기본 「콕 했어요」), native `<button>` 속성(`ChipButton`과 같이 `disabled`·`type` 제외, `aria-pressed`도 받지 않음).

## 접근성

- 글자가 상태를 알리므로 `aria-pressed`를 붙이지 않는다. 글자와 눌림 상태가 함께 바뀌면 「콕 했어요, 눌림」처럼 겹쳐 읽힌다.
- 목록처럼 같은 글자가 여러 번 나오면 호출자가 `aria-describedby`로 장소 이름을 붙인다(`PlacePickItem`이 그렇게 함).

## Styling과 의존성

- `ChipButton` `size="M"`(높이 36, 좌우 10)에 `LineHandClickSmallIcon`(16)을 오른쪽 아이콘으로 넘긴다.
- 담기 전 글자는 Figma `text-secondary`(#25282D)라 `ChipButton` 기본(`text-tertiary`)을 덮는다. 담긴 뒤는 `ChipButton` `selected` 모양(`surface-inversed`, 흰 글자).
- Storybook: `Default`(누르면 바뀜), `Picked`.

## 확인할 항목

- 「콕 했어요」를 누르면 콕 취소 확인이 열린다. 이름이 동작이 아닌 상태를 말하므로, 이름을 「콕하기」로 고정하고 `aria-pressed`를 쓰는 방식과 비교해 스크린 리더로 확인한다.

## 검증

- 단위 테스트: 두 글자, `aria-pressed` 없음, 담기 전 글자색.
