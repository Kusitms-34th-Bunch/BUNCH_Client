# 컴포넌트: Label

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 픽셀 실측과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Label - 01`(node `796:4780`). Figma 상태 이름 `Disabled` / `Default` / `Pressed`를 코드 상태로 옮겨 쓴다(아래 "상태와 동작"). 코드 이름은 Figma 이름을 따라 `Label`이다(`- 01`은 변형 번호라 뺐다).
- 화면설계서: 이용약관 화면의 "이용약관 동의" 영역(설계서 프레임 `796:9226`, node `796:6361`).

## 목적과 범위

### 제공하는 동작

- 343px 폭의 전체 선택 행(체크 아이콘 + 글자). 눌러서 체크를 켜고 끈다.
- 설계서: "필수 약관 모두 체크하기" 선택 시 하위 필수 약관을 전체 선택·해제하고, 하위 약관이 모두 선택되면 이 행도 선택된다.

### 제공하지 않는 동작

- 하위 항목과 묶는 동작(전체 선택·해제, 하위가 모두 선택되면 이 행 선택)은 화면(feature)이 `checked`와 `onChange`로 연결한다(`Web/Label`의 `WithChildren` story에 예시).
- 시작하기 버튼 활성화 같은 화면 흐름은 다루지 않는다.
- Figma에 별도 비활성 시각 표현은 없다(선택 전 모양이 이미 흐리다).

## Public API

- Props: `children`(필수, 접근성 이름), 그리고 native `<input type="checkbox">`의 속성(`checked`, `defaultChecked`, `onChange`, `disabled`, `name` 등. `type`은 고정). `className`은 행 전체에 적용한다.
- 제어 방식: `checked` + `onChange`(controlled) 또는 `defaultChecked`(uncontrolled) 모두 쓸 수 있다.
- 호출자 소유 책임: 글자(문구·i18n), 하위 항목과의 연동, 폼 제출.

## 상태와 동작

Figma 상태 이름은 의미와 다르다. 사용자가 정리해 준 대응은 다음과 같다.

| Figma 상태 | 코드 상태 | 모양                                                                         |
| ---------- | --------- | ---------------------------------------------------------------------------- |
| `Disabled` | 선택 전   | 행 전체 40% 투명, 선 아이콘(`#bcbec2`, 안쪽 `#eaeaea`), 글자 `text-disabled` |
| `Default`  | 선택됨    | 불투명, 채운 아이콘(`#a7adff`), 글자 `text-primary`                          |
| `Pressed`  | 누르는 중 | 선택된 모양에 검정 20% 오버레이(배경 `#c1c2cc`, 아이콘 `#868acc`)            |

- 눌림은 선택 전·후 어느 쪽에서 눌러도 같은 모양이다(Figma 설계서: Disabled → Pressed → Default, 체크 해제 시 Pressed → Disabled). 오버레이는 아이콘·글자 위까지 덮는다.
- 전환: 설계서의 "Smart Animate / Ease out / 100ms"에 맞춰 투명도·오버레이를 100ms ease-out으로 바꾼다. 아이콘 교체는 전환 없이 바뀐다.
- `disabled`를 넘기면 native 대로 눌리지 않고 `cursor-not-allowed`다. 별도 시각은 없고, 눌러도 눌림 모양이 나오지 않는다.
- 긴 글자: 줄바꿈되어 모두 보인다.

## 접근성

- Semantic element: `<label>` 안의 native `<input type="checkbox">`(화면에서는 시각적으로 숨김). 글자가 접근성 이름이 되고 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab으로 이동, Space로 토글. 포커스 링은 `has-[input:focus-visible]`로 행 전체에 그린다.
- 선택 상태는 native `checked`로 전달된다. 색만으로 전달하지 않는다(아이콘 모양도 다르다).

## Styling과 의존성

- Token: `bg-chip-blue-bg`, `rounded-r4`, `px-padding-p4`, `py-padding-p5`, `gap-s3`, `typography-heading-2-semibold`, `text-text-disabled`·`text-text-primary`, `text-icon-quaternary`·`fill-surface-disabled`(선택 전 아이콘), `text-surface-brand-subtle-2`(선택된 아이콘), `before:bg-overlay-pressed`, `--semantic-opacity-disabled`. 아이콘은 `LineCircleCheckMediumIcon`, `FillCircleCheckMediumIcon`(기존 20px 아이콘).
- dependency 추가 없음.
- Storybook state matrix: `Default`, `Checked`, `Disabled`, `States`, `LongLabel`, `WithChildren`.

## 확인할 항목

- 선택 방식 (확정): 설계서가 여러 하위 약관을 각각 체크하고 전체 선택·해제하는 방식이라 체크박스로 구현했다. 이슈 #41에는 "단일 선택"으로 적혀 있으나 그 설명은 `Year Option`(연도 하나 선택)에만 해당한다.
- 이름 (확정): Figma 이름을 따라 `Label`로 두었다. 의미는 "필수 항목 모두 체크하기" 전체 선택 행이다.
- 선택 전 아이콘 안쪽 색 (제안): Figma 선 아이콘은 원 안쪽을 `#eaeaea`로 채운다. 기존 `LineCircleCheckMediumIcon`은 채움이 없어 CSS `fill`로 `surface-disabled`를 덮었다. 아이콘 에셋을 따로 받으면 교체한다.
- 비활성 시각 (제안): Figma에 별도 비활성 표현이 없어 만들지 않았다. 필요하면 디자이너 확인 후 추가한다.
- 눌림 중 아이콘 교체 (제안): 설계서가 Pressed를 선택된 모양으로 보여 주므로 눌러서 선택되는 순간의 모양을 미리 보여 주는 것으로 해석했다.
- 선택 전 글자 대비 (미정): 행 전체가 40% 투명이라 글자(`text-disabled`)가 배경과 합쳐 약 1.4:1로 추정돼 WCAG 4.5:1에 못 미친다. 선택 전도 눌러야 하는 활성 상태라 디자이너 확인이 필요하다(Figma 값 그대로).
- 선택 여부 전달 (확인): 선택 전후로 아이콘 모양(선/채움)이 달라 색만으로 전달하지 않는다. 스크린 리더에는 native `checked`가 전달된다.
- 포커스 링 (확정): 투명도가 적용되는 안쪽 행이 아니라 바깥 label에 그려서 선택 전에도 흐려지지 않는다. 렌더 픽셀로 확인했다(선택 전·선택됨 모두 `#454edf`).
- 키보드 누름 (미검증): Space 누름의 `:active` 처리는 브라우저마다 다르다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `label` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(237 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인: Figma 픽셀 실측과 실제 렌더 픽셀 대조(선택 전·선택됨·눌림의 배경·아이콘 색 일치), 포커스 링 색 확인. 실기기는 미검증
