# 컴포넌트: ConfirmSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 05 `2487:46352`(속성: 제목, `sub` 부제, `discription` 안내 상자)

## 목적과 범위

- 되돌리기 어려운 동작 전에 그림·제목·부제·안내 상자로 확인받는 시트. 예: 번치 차단, 관리자 지정 후 나가기(`AdminTransferSheet`가 이 시트에 문구를 채운 것).
- 동작의 실행과 이후 이동·안내는 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `title`: 확인할 내용(시트 이름, 낭독용 글자를 덧붙일 수 있게 노드도 받음). `description?`: 제목 아래 부제(시트 설명, 줄바꿈 유지). `notice?`: 회색 안내 상자(줄바꿈 유지).
- `illustration?`: 제목 위 그림(기본 92px). 장식이면 호출자가 `alt=""`. `illustrationClassName?`으로 자리 크기를 바꾼다(Figma 05 원본과 광고 숨기기는 72px).
- `confirmLabel`, `onConfirm()`, `confirming?`(처리 중 확인 비활성). 「취소」 글자는 고정이다.

## 상태와 동작

- 「취소」는 닫기 요청(`onOpenChange(false)`). 바깥 터치·끌기·ESC로도 닫힌다. 확인은 onConfirm만 부르고 닫기는 호출자 담당.

## 접근성

- 제목이 시트 이름, 부제가 있으면 부제가 설명이다. 부제가 없으면 안내 상자가 설명이라 열 때 제목과 함께 읽힌다.

## Styling과 의존성

- `AdminTransferSheet`에서 옮긴 Figma 05 간격과 글자: 손잡이 아래 40, 그림·제목 20, 제목·부제 2, 부제·상자 32, 상자·버튼 30, 버튼 가로 2개(`tertiary` 취소, 글자 `text-tertiary`, `primary` 확인), 버튼 아래는 Safe Area(없으면 8).

## 확인할 항목

- 안내 상자 없는 모양: 광고 숨기기(Figma `5991:164178`)처럼 `notice`를 넘기지 않는다.

## 검증

- [x] test 2개: 제목·부제·안내 상자 표시 조건, 취소·확인 분리와 처리 중 비활성
- [x] Story: Default(차단 확인), WithDescription, WithoutIllustration, Confirming
