# 컴포넌트: YearOption

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 픽셀 실측과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Year_Option`(node `831:9717`). Figma 상태 이름 `Default` / `Pressed` / `Disabled`를 코드 상태로 옮겨 쓴다(아래 "상태와 동작"). 코드 이름은 `YearOption`이다.
- 화면설계서: 프로필 작성 화면의 "출생연도" 영역(설계서 프레임 `796:9226`, node `796:9142`).

## 목적과 범위

### 제공하는 동작

- 343px 폭의 연도 선택 행(글자 + 선택 시 오른쪽 체크 아이콘). 목록에서 하나만 고르는 단일 선택 라디오다.

### 제공하지 않는 동작

- 연도 목록 만들기, 입력 범위(설계서: 최신연도 - 14부터 1930까지, 연도가 바뀌면 최대 연도 갱신), "선택 안함"을 항상 맨 위에 두기, 선택값 반영과 모달은 화면(feature)이 맡는다. 설계서상 연도 입력은 선택 사항이고 직접 입력은 불가다.
- 눌림 전용 시각 표현은 없다(Figma `Pressed`는 선택된 모양이다).

## Public API

- Props: `children`(필수, 접근성 이름), 그리고 native `<input type="radio">`의 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled` 등. `type`은 고정). `className`은 행 전체에 적용한다.
- 같은 `name`을 주면 하나만 선택된다. 호출하는 쪽이 `fieldset`·`legend` 또는 `radiogroup`으로 묶어 질문(예: "출생연도")을 전달한다.
- 호출자 소유 책임: 연도 글자와 목록, 그룹 이름·질문, 선택값 반영.

## 상태와 동작

Figma 상태 이름은 의미와 다르다. 사용자가 정리해 준 대응은 다음과 같다.

| Figma 상태 | 코드 상태 | 모양                                                  |
| ---------- | --------- | ----------------------------------------------------- |
| `Default`  | 선택 전   | 글자 `text-secondary`                                 |
| `Pressed`  | 선택 후   | 글자 `text-secondary` + 오른쪽 체크 아이콘(`#bcbec2`) |
| `Disabled` | 비활성    | 글자 `text-tertiary`, 선택할 수 없음                  |

- 다른 연도를 고르면 기존 선택은 해제되고 선택값이 바뀐다(설계서 성별 항목과 같은 방식).
- 비활성은 native `disabled`라 클릭과 키보드가 모두 막히고 `cursor-not-allowed`다.

## 접근성

- Semantic element: `<label>` 안의 native `<input type="radio">`(시각적으로 숨김). 글자가 접근성 이름이고 아이콘은 `aria-hidden`이다.
- Keyboard·focus: 같은 `name`의 라디오는 Tab으로 그룹에 들어가고 방향키로 연도를 옮긴다. 포커스 링은 행 전체에 그린다.
- 선택 상태는 native `checked`로 전달되고, 체크 아이콘이 모양으로도 알려 준다.

## Styling과 의존성

- Token: `typography-body-1-regular`, `text-text-secondary`·`text-text-tertiary`, `px-padding-p3`, `py-padding-p2`, `text-icon-quaternary`. 아이콘은 `FillCircleCheckMediumIcon`(기존 20px 아이콘).
- dependency 추가 없음.
- Storybook state matrix: `Default`, `Selected`, `Disabled`, `Group`.

## 확인할 항목

- 선택 방식 (확정): 이슈 #41의 "단일 선택"에 맞춰 라디오로 구현했다. `Label`·`TermsLabel`은 설계서에 따라 체크박스다.
- 비활성 (확정): Figma `Disabled`는 비활성으로 확인했다. Figma가 비활성을 `button`이 아닌 정적 글자로 그려 두었으므로, 비활성 연도는 포커스·선택 대상에서 빠진다.
- 행 높이 (제안): Figma 행은 32px(글자 24 + 위아래 4)다. 터치 영역이 44px에 못 미치는데 디자인 값이라 그대로 두었다. 디자이너 확인.
- 비활성과 선택 전의 구분 (확인): Figma `Disabled`는 글자색만 다르다(`text-tertiary`). 선택할 수 없다는 점은 native `disabled`로 전달된다.
- 눌림 피드백 (제안): Figma에 눌리는 중 전용 모양이 없어 만들지 않았다.
- 체크 아이콘 위치 (미검증): Figma 오른쪽 끝 정렬을 `justify-between`으로 옮겼다. Figma와 픽셀 단위로 대조하지는 않았다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `yearOption` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(237 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인: Figma 픽셀 실측과 실제 렌더 픽셀 대조(행 343×32, 선택 시 체크 아이콘 `#bcbec2` 일치). 글자 색·포커스·실기기는 미검증
