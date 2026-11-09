# 컴포넌트: BundlePickPhoto

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Bundle Pick Photo`(node `4977:471`)

## 목적과 범위

- 번들 픽 화면의 사진 카드다. 사진만 그린다.
- 넘김, 눌림 모션, 픽 상태는 호출하는 쪽이 맡는다.

## Public API

- Props: `src`(필수), `alt`(필수), 그리고 native `<div>`의 속성. `className`은 카드 틀에 적용한다.

## 접근성

- `alt`가 사진의 접근성 이름이다.

## Styling과 의존성

- 295×396(`w-73.75 h-99`), `rounded-r3`, 가운데를 잘라 채운다(`object-cover`).

## 확인할 항목

- 컴포넌트 원본 높이는 393이고 화면 인스턴스와 설명은 396이다. 396을 따랐다.

## 검증

- 단위 테스트: 대체 텍스트, `className` 적용.
