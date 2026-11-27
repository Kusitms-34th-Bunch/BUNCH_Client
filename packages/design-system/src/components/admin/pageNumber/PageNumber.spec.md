# 컴포넌트: PageNumber

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #590, 브라우저 시각 비교 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Page Number`(node `7601:160831`). Figma 이름과 코드 이름이 같다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 목록 아래 페이지 이동의 숫자 버튼 하나.
- 상태: Default, Hover, Selected(현재 페이지), Disabled.

### 제공하지 않는 동작

- 페이지 번호 묶음(이전·다음 화살표, 생략 표시, 번호 범위 계산)은 만들지 않는다. 화면설계서에서 묶음 모양을 확인한 뒤 별도로 정한다.

## Public API

- Props:
  - `page: number`: 표시할 페이지 번호.
  - `selected?: boolean`: 현재 페이지 여부. 기본 `false`.
  - native `<button>`의 속성(`onClick`, `disabled`, `className`, `ref`, `aria-label` 등).
- `type` 기본값은 `button`이다.
- 이벤트: `onClick`.
- Controlled / uncontrolled: controlled. 현재 페이지는 호출하는 쪽이 정한다.
- 호출자 소유 책임: 페이지 이동, 묶음을 감싸는 `<nav aria-label>`.

## 상태와 동작

- Default: 숫자 `body-4-regular` `text-tertiary`.
- Hover(현재 페이지가 아닐 때): `overlay-hover` 덮개를 글자 위까지 얹어 글자도 함께 어두워진다.
- Selected: 바탕 `surface-inversed-lighter`, 숫자 `text-inversed`.
- Disabled: 숫자 `text-disabled`에 흐림 40%, 누를 수 없다. 현재 페이지가 비활성이면 어두운 바탕이라 글자색은 `text-inversed`로 두고 흐림만 적용한다.
- 긴 숫자: 최소 24×24를 지키고 세 자리 이상이면 가로로 늘어난다(아래 확인할 항목).

## 접근성

- Semantic element: native `<button type="button">`.
- 현재 페이지: `aria-current="page"`로 전달한다.
- Accessible name·label: 숫자가 그대로 읽힌다. 호출하는 쪽이 `aria-label`로 바꿀 수 있다.
- Keyboard·focus: Tab으로 이동하고 Enter·Space로 누른다. 포커스 윤곽은 `outline-border-brand` 2px이다.

## Styling과 의존성

| Figma 값                                                       | 토큰·클래스                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 크기 24×24, `radius-r2`(4)                                     | `h-6 min-w-6 px-1 rounded-r2`                                                |
| 숫자 `Body-4-Regular` 13/18                                    | `typography-body-4-regular`                                                  |
| Default 숫자 `text-tertiary`                                   | `text-text-tertiary`                                                         |
| Hover `overlay-hover`(글자 위 덮개)                            | `before:bg-overlay-hover hover:before:opacity-100`                           |
| Selected 바탕 `surface-inversed-lighter`, 숫자 `text-inversed` | `bg-surface-inversed-lighter text-text-inversed`                             |
| Disabled 숫자 `text-disabled`, `opacity-disabled`(40)          | `disabled:text-text-disabled disabled:opacity-(--semantic-opacity-disabled)` |

- 허용되는 dependency: `cn`.
- Storybook state matrix: `Default`, `Selected`, `Disabled`, `Matrix`, `LongNumber`.

## 확인할 항목

- 세 자리 이상 숫자 (제안): Figma는 24×24 고정이다. 세 자리 숫자가 넘치지 않게 `min-w-6`과 좌우 4px 패딩으로 가로만 늘린다. 한두 자리는 24×24 그대로다.
- Figma `showNumber` 속성 (확정): 컴포넌트 속성 패널의 숫자 표시 켜기·끄기 값이다. 화면에 숫자 없는 칸은 없어 구현하지 않는다(2026-11-27 사용자 확인).
- Hover 글자색 (확정): Figma Hover도 `text-tertiary` 토큰이다. 덮개가 글자 위까지 덮는 모양이라 덮개를 내용 위에 얹는다(2026-11-27 Figma 변수 확인).

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(`@app/design-system/admin`, `yarn gen:index`)
- [x] 실행 command와 결과: `yarn workspace @app/design-system vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
