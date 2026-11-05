# 컴포넌트: DateChangeSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 02 `2487:46355`, 기능명세 `docs/specs/photo-box.md` 3.4.1

## 목적과 범위

- 사진 촬영 날짜를 바꾸는 시트. 닫기(왼쪽)·「저장」(오른쪽)과 한 달 달력(`Calendar`).
- 저장 요청, 다른 멤버 사진 확인 창, 토스트, 실패 시 시트 유지는 사진함 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `onSave(date)`: 고른 날짜(그날 0시, 기기 시간대)로 호출. 시각 유지 계산과 닫기는 호출자 담당.
- `saving?`: 저장 중 중복 저장 방지.
- `defaultDate?`: 처음 고른 상태로 보여 줄 날짜. 그 달을 먼저 보이고 그 날짜가 선택돼 있다. 없으면(기본) 오늘 달을 선택 없이 연다. 처음 선택 상태는 화면 명세마다 달라서 호출하는 쪽이 정한다(사진 상세는 사진의 촬영 날짜, 사진함 선택 모드는 없음).

## 상태와 동작

- 열 때마다 처음 상태로 연다: 기본은 오늘이 있는 달·선택 없음, `defaultDate`가 있으면 그 날짜가 있는 달에 그 날짜를 고른 채. 선택 state는 `BottomSheet.Content` 안쪽이라 닫히면 지워지고 다시 열면 처음 상태가 된다.
- 오늘 이후는 흐림·선택 불가(`maxDate`). 오늘 표시는 없다. 날짜는 하나만 고른다.
- 날짜를 고르기 전과 `saving` 중에는 「저장」이 동작하지 않는다. `defaultDate`가 있을 때는 그 날짜 그대로도 저장할 수 없고(안내 「다른 날짜를 고르면 저장할 수 있어요」) 다른 날짜를 골라야 켜진다.

## 접근성

- 화면에 제목이 없어 숨긴 제목 `날짜 바꾸기`가 시트 이름이다.
- 「저장」은 `disabled` 대신 `aria-disabled`를 써서 초점을 잃지 않는다. 비활성일 때 숨긴 안내를 설명으로 연결한다(선택 전 「날짜를 고르면 저장할 수 있어요」, 저장 중 「저장 중이에요」). 비활성일 때는 누름 오버레이를 표시하지 않는다.
- 달력 접근성은 `Calendar` spec을 따른다.

## Styling과 의존성

- `BottomSheet`(`handle={false}`, `pt-padding-p7`), `Calendar`, `TextButton variant="primary" size="md"`.
- 비활성 「저장」 글자색 `text-disabled`.

## 확인할 항목

- 위 모서리 (제안): Figma 02만 20px. 시트 기본 24px(`r10`)을 따른다.
- 요일 글자 (확정): `Su`~`Sa`는 디자인 의도(`Calendar` spec).

## 검증

- [x] test 4개: 오늘 달·선택 없음·비활성 이유 안내, 선택 전 저장 안 함, 고른 날짜로 `onSave`, 닫았다 열면 초기화
- [x] `defaultDate` test 4개: 그 달·그 날짜 선택 상태로 열림, 그대로는 저장 불가와 안내, 다른 날짜로 `onSave`, 닫았다 열면 처음 날짜로 복귀
- [x] Story: Default, WithDefaultDate, Saving
- [x] Storybook: 실제 2026년 10월 렌더, 오늘 이후 흐림
