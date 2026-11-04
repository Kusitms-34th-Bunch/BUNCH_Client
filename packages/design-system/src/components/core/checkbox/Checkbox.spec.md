# 컴포넌트: Checkbox

## 메타데이터

- 소유 경계: design-system `core`(`@app/design-system`으로 import). 제품 문구·데이터를 모르는 선택 컨트롤이라 모든 앱이 쓸 수 있다.
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `MY 컴포넌트` 안 `Checkbox`(node `3524:62333`)
- 이슈: #205(`Toggle`, `ToggleListItem`과 함께)

## 목적과 범위

### 제공하는 동작

- 24px 사각 체크박스. native `<input type="checkbox">`를 그대로 쓰고 상자와 체크만 덮어 그린다.
- 상태: Default, Pressed(누르는 동안), Selected, Disabled.

### 제공하지 않는 동작

- 글자(라벨)와 그룹. 이름은 호출하는 쪽이 `aria-label`이나 감싸는 `<label>`로 준다.
- 일부 선택(indeterminate) 모양. Figma에 없다.
- Hover 모양. Figma에 없다.

## Public API

- Props: native `<input type="checkbox">`의 속성(`type`·`children` 제외). `className`은 바깥 24px 래퍼에 적용한다.
- 제어 방식: `checked` + `onChange` 또는 `defaultChecked` 모두 쓸 수 있다.
- 호출자 소유 책임: 접근성 이름, 그룹(`fieldset`·`legend`), 선택 값 관리.

## 상태와 동작

- Default: 흰 상자 + 1px `border-secondary`.
- Pressed(`:active`, 선택 전·활성일 때): 흰 상자 위에 `overlay-pressed`(20%). 감싸는 `label`을 누를 때도 같다.
- Selected(`:checked`): 상자와 테두리가 `surface-inversed-lighter`, 가운데 20px 흰 체크(`LineCheckMediumIcon`).
- Disabled(`:disabled`): `icon-disabled` 상자 + `border-disabled` 테두리를 40%로 흐리게.
- 키보드 포커스(`:focus-visible`): 2px `border-brand` 윤곽선.
- 전환 효과 없음(Figma에 정의 없음).

## 접근성

- Semantic element: native `<input type="checkbox">`. 키보드·스크린 리더 동작은 브라우저 기본이다.
- Keyboard·focus: Tab으로 들어가고 Space로 선택한다.
- 터치 영역: 24px로 WCAG 2.5.8 최소 크기를 충족한다. 글자와 함께 `<label>`로 감싸면 누르는 영역이 넓어진다.
- 색만으로 전달하지 않는다: 선택은 체크 모양으로도 구분된다.
- 강제 색상 모드: 테두리와 선택 배경을 `CanvasText`, 체크를 `Canvas`로 칠한다. 실제 고대비 테마 렌더는 확인하지 않았다.

## Styling과 의존성

| Figma       | 값                               | 사용한 토큰·utility                                                                |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| 크기·모서리 | 24×24, radius 4                  | `size-s12 rounded-r2`                                                              |
| Default     | 흰색, 1px `#E1E2E5`              | `bg-surface-primary border-border-secondary`                                       |
| Pressed     | 흰색 + 검정 20%                  | `overlay-pressed`(배경 겹침)                                                       |
| Selected    | `#535A61`, 흰 체크 20px          | `surface-inversed-lighter`, `text-icon-inversed`                                   |
| Disabled    | `#BCBEC2`, 테두리 `#F5F5F5`, 40% | `bg-icon-disabled border-border-disabled`, `opacity-(--semantic-opacity-disabled)` |

- dependency 추가 없음. 체크 아이콘은 Figma `Line/Icon-{S,M,L}/Check`를 아이콘 파이프라인에 추가해 `LineCheckIcon`으로 생성했다.
- Storybook state matrix: Default·Selected·Disabled·States·WithLabel. Pressed는 `:active`라 정지 화면 story가 없다.

## 확인할 항목

- Disabled + Selected (제안): Figma에 없다. 비활성 회색 상자 위에 체크를 40%로 보이게 했다. 디자인을 받으면 맞춘다.
- Pressed 의미 (제안): Figma `Status=Pressed`를 누르는 동안(`:active`)의 모양으로 보고 선택 전에만 적용했다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] Storybook 렌더와 Figma 대조(Default·Selected·Disabled, Pressed는 정지 화면이라 제외)
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`, `vitest run src/components/core/checkbox src/components/core/toggle src/components/web/toggleListItem src/icons`(32개 통과). Storybook 렌더를 Chrome에서 Figma 스크린샷과 눈으로 대조했다. 스크린 리더, 고대비 테마, 실기기는 확인하지 않았다.
