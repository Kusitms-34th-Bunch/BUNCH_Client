# 컴포넌트: Option

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 크기·색과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Option`(node `796:4803`). Figma 이름과 코드 이름이 같다. Figma의 `Options=Required` / `Optional`은 `variant`(`required` / `optional`)로 옮겼다.
- 화면설계서: 프로필 작성 화면에서 닉네임은 필수 입력, 성별·출생연도는 선택 입력으로 쓴다(설계서 프레임 `796:9226`, node `796:6955`·`796:9148`·`796:9142`).

## 목적과 범위

### 제공하는 동작

- 입력 항목 제목 옆에 붙는 작은 표시. 필수(`필수`, 브랜드 색)와 선택(`선택`, 흐린 색)이 있다.

### 제공하지 않는 동작

- 입력 검증은 하지 않는다. 필수 입력인지 판단하고 검증하는 일은 호출하는 쪽이 한다.
- 독립된 입력 컴포넌트가 아니라 표시라서 상호작용·포커스가 없다. 보통 `LabeledTextField`의 제목 옆에서 쓴다.

## Public API

- Props: `variant`(`required` 기본 / `optional`), `children`(없으면 "필수" / "선택"), 그리고 native `<span>` 속성(`className` 등).
- 호출자 소유 책임: 글자를 바꿀 때의 문구(i18n), 실제 필수 입력 검증.

## 상태와 동작

- `required`: 글자 `text-brand`(`#454edf`). `optional`: 글자 `text-quaternary`(`#bcbec2`).
- 글자는 12px Medium(`typography-caption-1-medium`)이고 줄바꿈하지 않는다.

## 접근성

- Semantic element: `<span>`(역할 없는 표시용). 글자가 그대로 읽힌다.
- 필수 입력의 의미는 `aria-required` 같은 속성으로 입력창이 전달해야 한다(`LabeledTextField`가 처리). 이 표시만으로는 보조기기에 필수 여부를 전달하지 않는다.
- 색 대비: `optional`의 `#bcbec2`는 흰 배경에서 약 1.8:1로 낮다(Figma 값). 글자가 "선택"이라는 정보를 담고 있어 색만으로 전달하지는 않는다.

## Styling과 의존성

- Token: `typography-caption-1-medium`, `text-text-brand`, `text-text-quaternary`. dependency 추가 없음.
- Storybook state matrix: `Required`, `Optional`, `Both`.

## 확인할 항목

- 이름 (확정): Figma 이름을 따라 `Option`으로 두었다. 브라우저 전역 `Option`(HTMLOptionElement 생성자)과 이름이 같지만 모듈 안에서 import해 쓰므로 충돌하지 않는다.
- `optional` 대비 (미정): `#bcbec2` 글자는 흰 배경에서 4.5:1에 못 미친다. Figma 값이라 바꾸지 않았고 디자이너 확인이 필요하다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `option` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(240 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인: Figma 크기(`21×16`)와 글자 색(`#454edf`) 대조. 선택 변형 색과 실기기는 미검증
