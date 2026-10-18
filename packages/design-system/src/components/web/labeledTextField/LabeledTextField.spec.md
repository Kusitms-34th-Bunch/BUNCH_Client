# 컴포넌트: LabeledTextField

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 높이·구조와 대조함. 색·픽셀 대조 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Labled_Text_Field`(node `796:4808`). Figma 이름의 오탈자(`Labled`)를 바로잡아 코드 이름은 `LabeledTextField`다. Figma 상태 `Default` / `Disabled` / `Focused` / `Editing` / `Filled` / `Error`는 props와 입력 상태로 옮겼다(아래 "상태와 동작").
- 화면 설계서: `화면 설계서 - 로그인, 이용약관, 프로필 작성`(node `796:9226`)의 프로필 작성 화면 3번 "닉네임"(node `796:6955`).

## 목적과 범위

### 제공하는 동작

- 부모 폭을 채우는 입력 행(Figma 기준 343px): 제목 + 필수·선택 표시(`Option`) + 입력창 + 오른쪽 아래 글자 수 또는 왼쪽 아래 오류 문구.
- 입력창은 core `TextField`를 그대로 쓴다. 나머지 props는 입력창(`input`)에 전달된다.
- 글자 수: `maxLength`를 주면 오른쪽 아래에 "현재/최대"(예: `0/12`)를 보이고, 입력은 그 길이로 제한된다. controlled(`value`) 길이 또는 uncontrolled 입력의 실시간 길이를 센다.
- 지우기 버튼: 포커스가 있고 값이 있을 때만 오른쪽에 보인다(Figma `Editing`). 값을 비우는 일은 호출하는 쪽이 `onClear`로 한다.
- 오류: `errorMessage`가 있으면 입력창 아래 왼쪽에 빨간 글자로 보이고, 입력창에 `aria-invalid`가 걸린다.

### 제공하지 않는 동작

- 입력창의 native `title`(툴팁) 속성은 받지 않는다(`title`은 제목 prop). `defaultValue`가 바뀌거나 form reset이 일어날 때의 글자 수 갱신과, 이모지를 한 글자로 세는 처리는 하지 않는다(글자 수는 문자열 길이).
- 설계서의 입력 규칙(최대 12자, 한글·영문·숫자만, 특수문자·Emoji·줄바꿈 금지, 공백 처리, 닉네임 중복 확인과 그 오류 문구)은 화면(feature)이 맡는다. 이 컴포넌트는 값과 오류 문구를 받아 그릴 뿐이다.
- 오류일 때 입력창 테두리 색 변화는 Figma에 없어서 만들지 않았다. 입력창은 항상 `border-secondary`다.
- 포커스 링은 그리지 않는다(입력 필드 포커스 링은 만들지 않기로 한 결정을 따름). Figma `Focused`는 안내 문구가 사라지고 캐럿만 보여서, 입력창이 포커스되면 안내 문구를 숨긴다(core `TextField`에 반영).

## Public API

- Props: `title`(필수, 제목이자 입력창 접근성 이름), `option`(`required` / `optional`), `maxLength`, `errorMessage`, `className`(전체 영역), `disabled`, `value`·`defaultValue`·`onChange`·`onClear`·`id`·`name` 등 `TextField`의 나머지 props. `action`·`label`은 받지 않는다(`label`은 `title`이 대신한다).
- 호출자 소유 책임: 제목·오류 문구(i18n), 입력 규칙과 검증, 값과 `onClear` 처리.

## 상태와 동작

| Figma 상태 | 코드에서 표현                                                          |
| ---------- | ---------------------------------------------------------------------- |
| `Default`  | 값이 없고 포커스도 없는 입력창(placeholder)                            |
| `Focused`  | 값이 없는 채로 포커스. 안내 문구(placeholder)가 사라지고 캐럿만 보인다 |
| `Editing`  | 값이 있는 채로 포커스. 오른쪽에 지우기 버튼(`onClear`가 있을 때)       |
| `Filled`   | 값이 있고 포커스 없음. 지우기 버튼이 없다                              |
| `Error`    | `errorMessage`가 있음. 왼쪽 아래 빨간 문구 + 오른쪽 아래 글자 수       |
| `Disabled` | `disabled`. 제목·입력창·글자 수 전체가 `opacity-disabled`(40%)         |

- 글자 수 영역이 없으면(`maxLength`와 `errorMessage` 모두 없음) 입력창만 남는다(전체 높이 72px). 글자 수가 있으면 96px이다.
- 포커스가 지우기 버튼으로 옮겨 가도 입력 영역 안이면 포커스가 유지된 것으로 본다. 지우기를 누르면 값이 비워지고 입력창으로 포커스가 돌아간다.
- 긴 값은 입력창에서 한 줄로 잘린다.

## 접근성

- Semantic element: 제목은 `<label htmlFor>`로 입력창과 연결하고, 입력창에는 `aria-label`로 제목을 준다. 필수 표시는 시각 표시이고, 필수 여부는 입력창의 `aria-required`로 전달한다.
- 오류: 문구는 `role="alert"`로 나타날 때 알려지고, 입력창은 `aria-invalid`와 `aria-describedby`(오류 문구·글자 수)로 연결된다. 글자 수는 입력마다 읽히지 않도록 live region을 쓰지 않는다.
- Keyboard·focus: 제목을 누르면 입력창에 포커스가 간다. 입력창 다음 Tab으로 지우기 버튼에 간다.
- 비활성: 입력창이 native `disabled`라 포커스·입력이 막힌다. 영역 전체가 40% 투명이 된다.

## Styling과 의존성

- Token: `gap-s3`·`gap-s2`, `typography-body-2-meduim`(제목 14/21 SemiBold, 접미사 철자는 저장소 토큰 이름 그대로), `text-text-secondary`, `typography-caption-1-medium`·`text-system-fail-text`(오류, `#f04d29`), `typography-body-3-regular`·`text-text-tertiary`(글자 수), `--semantic-opacity-disabled`. 입력창은 core `TextField`, 표시는 `Option`을 쓴다.
- dependency 추가 없음.
- Storybook state matrix: `Default`, `Focused`, `Editing`, `Filled`, `ErrorState`, `Disabled`, `OptionalWithoutCounter`.

## 확인할 항목

- 오류 문구 색 (확정): Figma `system/system-fail-text`(`#f04d29`)와 같은 이름의 토큰 `text-system-fail-text`를 쓴다(`develop`의 디자인 토큰 갱신으로 추가됨). 흰 배경 대비는 약 3.8:1로 4.5:1에 못 미친다(Figma 값).
- 글자 수와 입력 제한 (제안): 설계서는 최대 12자와 글자 수 실시간 갱신을 요구한다. `maxLength`를 입력 길이 제한과 글자 수 표시에 함께 쓴다. Figma `Error` 시안은 제한을 넘은 문구("입력 가능한 글자수를 초과했어요")를 보여 주는데, 입력이 제한되면 그 문구가 필요 없을 수 있다. 제한 없이 넘길 수 있게 하려면 글자 수만 받는 prop을 따로 연다.
- 안내 문구 숨김 (확정): 입력창이 포커스되면 placeholder를 숨긴다(Figma `Focused`, 사용자 확인). core `TextField`의 스타일이라 이 입력창을 쓰는 곳 모두 같다.
- 지우기 버튼과 포커스 (제안): Figma의 `Editing`·`Filled` 차이를 포커스 유무로 해석했다(사용자 설명: Editing은 글자가 하나라도 있을 때 오른쪽 삭제 버튼). 값이 있고 포커스가 있을 때만 보인다. Safari·터치에서 버튼을 누르는 순간 입력창 포커스가 빠져 버튼이 사라지지 않도록 버튼의 `mousedown` 기본 동작을 막는다(실제 Chromium에서 확인, Safari 재현은 미검증). uncontrolled 입력은 지우기를 지원하지 않는다(`TextField`의 `onClear` 계약).
- 오류 시 입력창 모양 (제안): Figma가 테두리·배경을 바꾸지 않아 그대로 두었다. 오류를 문구 색만으로 전달하지 않도록 `aria-invalid`와 문구를 함께 쓴다.
- 이름 (확정): Figma `Labled_Text_Field`의 오탈자를 바로잡아 `LabeledTextField`로 했다.
- 접근성 이름 (제안): 입력창은 `aria-label`로 제목만("닉네임") 이름을 갖고 화면의 라벨은 "닉네임 필수"라서 보이는 글자와 이름이 정확히 같지는 않다. "필수"가 이름에 들어가면 `aria-required`와 겹쳐 중복 안내되므로 지금 구조를 유지한다. 음성 제어에서 "필수"를 함께 말해야 하는지는 확인이 필요하다.
- 글자 수 읽힘 (제안): `aria-describedby`에 오류 문구와 글자 수("3/12")가 들어가 포커스할 때 숫자만 읽혀 맥락이 부족할 수 있다. 입력 중 갱신은 읽히지 않는다(live region 없음). 필요하면 접근성 전용 문구를 추가한다.
- 오류 알림 (확인): `role="alert"`는 오류 문구가 나중에 나타날 때 읽힌다. 처음부터 있는 오류는 포커스할 때 `aria-describedby`로 읽힌다. 타이핑마다 오류 문구가 바뀌면 연속으로 읽힐 수 있어 호출하는 쪽이 갱신 빈도를 관리한다.
- 비활성과 오류 (확인): 컴포넌트 전체에 40% 투명이 걸려 비활성이면서 오류인 경우 오류 문구도 흐려진다.
- 키보드 포커스 표시 (미정): 입력 필드 포커스 링을 만들지 않기로 한 결정이라 키보드 사용자가 포커스 위치를 구분하기 어렵다. 디자이너가 포커스 상태를 정하면 반영한다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `labeledTextField` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(240 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인: Figma와 높이 일치(글자 수·오류가 있을 때 96px, 없을 때 72px), 구조·레이아웃 눈 대조. 색·픽셀 단위 대조와 실기기는 미검증
