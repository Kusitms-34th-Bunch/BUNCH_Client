# 컴포넌트: RadioButton

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: `Radio Button`(Default `2500:48249`, Selected `2500:48257`), 컨트롤 `Control Radio - S`

## 목적과 범위

- 16px 라디오와 글자 한 줄. 행 어디를 눌러도 선택된다(신고 사유 목록 등).
- `core/radio`의 `Radio`(20px, 브랜드 색)와 다른 Figma 컴포넌트다. 이 컨트롤은 선택 시 회색(`icon-tertiary`)이다.

## Public API

- `children`: 글자이자 라디오의 접근성 이름.
- native `<input type="radio">` 속성(`name`, `value`, `checked`, `onChange`, `disabled` 등). `className`은 행(`<label>`)에 적용한다.
- 그룹(`fieldset`·`legend`, 같은 `name`)은 호출자가 만든다.

## 상태와 동작

- 기본: 흰 원, 0.8px `border-tertiary` 테두리.
- 선택: 1px `icon-tertiary` 링, 지름 9.6px `icon-tertiary` 점.
- 비활성: 행 전체 `opacity-disabled`(40%), 누를 수 없음. Figma에 없는 상태라 제안 값이다.

## 접근성

- native radio라 화살표 키 이동·Space 선택이 브라우저 기본으로 동작한다.
- 키보드 초점은 행에 `outline-border-brand` 2px로 표시한다.
- 강제 색상 모드에서 테두리·점을 시스템 색으로 그린다.

## Styling과 의존성

| Figma                                       | 구현                                            |
| ------------------------------------------- | ----------------------------------------------- |
| 행 패딩 8·4, 간격 8, radius `r4`            | `px-padding-p4 py-padding-p2 gap-s4 rounded-r4` |
| Body-3-Semibold 14/600/21, `text-secondary` | `typography-body-3-semi-bold`                   |
| 컨트롤 SVG 값                               | CSS로 그림(`border-tertiary`, `icon-tertiary`)  |

## 확인할 항목

- 글자 토큰 (확정): Figma `Body-3-Semibold`(14/600/21/-0.5)와 이름·값이 같은 `typography-body-3-semi-bold`를 쓴다.
- 누름 상태 (미정): Figma에 Pressed가 없어 만들지 않았다.

## 검증

- [x] test 2개: 같은 name 하나만 선택, 글자로 선택
- [x] Story: Default, Selected, Disabled, Group
- [x] Storybook(Chromium): 행 높이 29px, 컨트롤 16px, 선택 점 9.6px·`#535A61`, 링 1px
