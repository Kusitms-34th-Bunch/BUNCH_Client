# 컴포넌트: Radio

## 메타데이터

- 소유 경계: design-system `core`(`@app/design-system`으로 import). 제품 문구·데이터를 모르는 선택 컨트롤이라 모든 앱이 쓸 수 있다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `Control Radio`(node `1379:22006`). Figma 이름 `Control Radio`를 코드 이름 `Radio`로 줄였다.
- 이슈: #77(라디오 카드 `RadioCard`와 함께)

## 목적과 범위

### 제공하는 동작

- 20px 원형 라디오 컨트롤. native `<input type="radio">`를 그대로 쓰고 모양만 덮어 그린다.
- 상태: Default(흰 원 + 연한 테두리), Selected(브랜드색 링 + 안쪽 점), Pressed(누르는 동안 회색 링 + 점), Disabled(흰 원 위에 10% 어둡게).
- 같은 `name`의 라디오끼리 하나만 선택되는 동작과 방향키 이동은 브라우저 기본 동작이다.

### 제공하지 않는 동작

- 글자(라벨). 이름은 호출하는 쪽이 `aria-label`이나 감싸는 `<label>`로 준다. 글자가 붙은 카드형은 `RadioCard`(web).
- 그룹 묶음. 여러 개를 한 질문으로 묶는 `<fieldset>`·`<legend>`는 호출하는 쪽이 둔다.
- Hover 모양. Figma의 `Control Radio`에 hover 상태가 없다.

## Public API

- Props: native `<input type="radio">`의 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled`, `aria-label` 등. `type`·`children`은 제외). `className`은 바깥 20px 래퍼에 적용한다.
- 제어 방식: `checked` + `onChange`(controlled) 또는 `defaultChecked`(uncontrolled) 모두 쓸 수 있다.
- 호출자 소유 책임: 접근성 이름, 그룹(`name`·`fieldset`), 선택 값 관리.

## 상태와 동작

- Default: 흰 배경 + 1px `border-tertiary`.
- Selected(`:checked`): 링이 `icon-brand`, 안쪽 지름 12px 점이 `icon-brand`.
- Pressed(`:active`, 선택 전·활성일 때): 링과 점이 `icon-disabled`. 선택된 라디오를 누르면 Selected를 유지한다. 라디오를 감싼 `label`(카드)을 누를 때도 같은 모양이다. label 본문을 누르면 input에는 `:active`가 걸리지 않아서 `label:active` 조건을 따로 둔다(Chromium 확인).
- Disabled(`:disabled`): 흰 배경 위에 `overlay-hover`(10%). Figma에는 선택된 Disabled가 없어 별도 모양을 만들지 않았다(확인할 항목).
- 키보드 포커스(`:focus-visible`): 2px `border-brand` 윤곽선.
- 동작 줄이기·전환: 전환 효과가 없다.

## 접근성

- Semantic element: native `<input type="radio">`(투명하게 20px 원 위를 덮음). 키보드·스크린 리더 동작은 브라우저 기본이다.
- Accessible name·label: 호출자가 준다. 이름이 없으면 접근성 검사에서 걸린다.
- Keyboard·focus: Tab으로 그룹에 들어가고 방향키로 이동, Space로 선택. 포커스 윤곽선은 보이는 원에 그린다.
- 터치 영역: 컨트롤은 20px로 WCAG 2.5.8의 최소 24px보다 작다. 눌러서 쓰는 영역은 글자가 붙은 `<label>`이나 카드가 넓혀 주므로 단독으로 쓰지 말고 글자와 함께 감싼다. 더블탭 지연을 막으려고 `touch-manipulation`을 적용했다.
- 색만으로 전달하지 않는다: 선택은 색뿐 아니라 점의 유무로도 구분된다.
- 색 대비 (디자이너 확인): Default 테두리 `#EAEAEA`는 흰 배경에서 약 1.2:1이라 WCAG 1.4.11의 3:1에 못 미친다. Figma 값이라 코드에서 바꾸지 않았다. 선택됨은 브랜드색 링과 점이라 해당하지 않는다.
- 강제 색상 모드: 배경 `Canvas`, 테두리·점 `CanvasText`로 짝지어 칠한다. Chrome 강제 색상 에뮬레이션에서 선택된 라디오의 점(검정)과 원 배경(흰색)이 구분되고 링은 브랜드색으로 남는 것을 확인했다. Windows 고대비 검정 테마의 실제 렌더는 확인하지 못했다.

## Styling과 의존성

| Figma               | 값                      | 사용한 토큰·utility                                |
| ------------------- | ----------------------- | -------------------------------------------------- |
| 크기                | 20×20, radius full      | `size-5 rounded-full`                              |
| Default 배경·테두리 | 흰색, 1px `#EAEAEA`     | `bg-surface-primary border-border-tertiary`        |
| Selected 링·점      | `#454EDF`, 점 지름 12px | `border-icon-brand`, `before:size-3 bg-icon-brand` |
| Pressed 링·점       | `#BCBEC2`               | `icon-disabled`                                    |
| Disabled            | 흰색 + 검정 10%         | `overlay-hover`(배경 겹침)                         |

- dependency 추가 없음.
- Storybook state matrix: Default·Selected·Disabled, 그리고 그룹 예. Pressed는 `:active`라 정지 화면으로 만들 수 없어 story로 두지 않았다.

## 확인할 항목

- Disabled + Selected (제외): Figma에 없어 전용 모양을 만들지 않았다. 선택된 라디오에 `disabled`를 주면 원 배경만 10% 어두워지고(`#E6E6E6`) 링과 점은 Selected의 브랜드색 그대로다(Chrome에서 확인). 필요해지면 디자인을 받은 뒤 추가한다.
- Pressed 의미 (제안): Figma `State=Pressed`가 누르는 동안(`:active`)의 모양이라고 보고 선택 전에만 적용했다.
- 터치 영역 (미정): 20px 컨트롤 자체의 터치 영역 기준이 없다(`design-system-icons.md`는 아이콘 버튼 기준). 단독 사용이 생기면 정한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/core/radio src/components/web/radioCard`(13개 통과), `gen:index:check`, Prettier 통과.

Storybook을 빌드해 Chrome에서 Figma 4배 내보내기(`Control Radio` 프레임, 배경 `#3A3A3A`)와 같은 조건으로 비교했다. Default·Selected·Disabled·Pressed(마우스를 누른 채) 4상태의 20×20 영역 평균 채널 차이는 0.28·0.39·0.89·0.33(최대 18, 안티앨리어싱 수준)이다. 스크린 리더와 Windows 고대비 검정 테마는 확인하지 않았다. 키보드는 `userEvent`로 Tab 진입·Space 선택·방향키 이동을 테스트했다.
