# 컴포넌트: BundleCommentCard

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Bundle CommentCard`(node `1303:16140`). 변형은 `State=Default·Focused·Filled·Error·Editing` 5개다.
- 의존: `ProfileImage`(24px로 줄여 사용), `EditingAnimation`(Editing), 자동 높이 hook `useTextareaAutoHeight`(`labeledTextField`의 `.internal`, `LabeledTextArea`와 공유하도록 이 작업에서 꺼냄), iOS 확대 방지용 `inputScale.module.css`(`core/textField`).

## 목적과 범위

### 제공하는 동작

- 번들 발행 전에 멤버가 쓰는 코멘트 카드. 멤버 프로필·이름(내 코멘트면 "(나)")과 여러 줄 입력창을 담는다.
- 입력창은 한 줄로 시작해 줄바꿈되며 높이가 늘어난다.
- 오류 문구를 주면 카드 아래에 빨간 안내가 나온다(Figma `State=Error`, 예: 글자 수 초과).
- 다른 멤버가 쓰고 있는 코멘트는 입력창 대신 점 3개 애니메이션으로 보인다(`State=Editing`).

### 제공하지 않는 동작

- 글자 수 계산·제한, 코멘트 저장, 발행 가능 여부 판단은 호출하는 쪽이 한다. `error` 문구도 호출자가 정한다.
- 글자 수 표시(`현재/최대`)는 Figma의 코멘트 카드에 없어서 만들지 않았다.
- 비활성(`disabled`) 모양은 Figma에 없다(`readOnly`·`disabled`는 native 속성으로 넘길 수 있지만 스타일은 없다).

## Public API

- Props: `userName`(필수), `currentUser`(기본 `false`, 이름 뒤 "(나)"), `currentUserLabel`(기본 "(나)"), `profileSrc`, `label`(입력창 접근성 이름, 기본 "{이름} 코멘트"), `error`, `editing`, `editingLabel`, `className`(카드와 오류 안내를 묶은 바깥 요소), 그리고 native `<textarea>`의 속성(`value`·`defaultValue`·`onChange`·`placeholder`·`maxLength` 등. `rows`·`aria-label`·`aria-describedby`·`ref`는 제외).
- 안내 문구(`placeholder`) 기본값은 "코멘트를 남기면 번들을 발행할 수 있어요."다.
- 값은 `value`(controlled)나 `defaultValue`(uncontrolled) 모두 가능하다. `editing` 동안에도 입력창은 숨겨서 DOM에 남아 있어(`hidden`) uncontrolled로 입력한 값이 사라지지 않고, 호출하는 쪽이 값을 따로 보관하지 않아도 된다. `defaultValue`만 쓰는 입력(`value`를 주지 않음)도 입력할 때마다 높이가 맞춰진다(hook이 `value`가 없을 때만 `input` 이벤트를 들어, `value`로 제어하는 `LabeledTextArea`의 동작은 그대로다).
- 호출자 소유 책임: 이름·안내 문구·오류 문구·읽어 주는 문구의 i18n, 글자 수 제한과 `error` 판단, `editing` 여부(다른 멤버의 작성 상태), 저장.

## 상태와 동작

- 카드: 흰 배경(`surface-primary`), 1px `border-tertiary`(`#EAEAEA`), 반경 `r5`(10px), 안쪽 여백 14px(`padding-p7`·`s7`), 요소 간격 8px(`s4`). 폭은 부모를 채운다(Figma 344px).
- 머리 줄: 프로필 24px(1px `border-tertiary`) + 이름. 사이 간격 6px(`s3`). 이름은 `typography-body-1-medium`(16/24, 500, 자간 -0.25px) `text-primary`(Figma는 순수 검정)이고 "(나)"는 2px(`s1`) 간격으로 붙는다.
- Default: 입력창이 비어 안내 문구가 흐린 SemiBold(`placeholder:text-quaternary`, 600, 자간 -0.5px)로 보인다. 높이는 14px 여백 + 머리 24 + 간격 8 + 입력 25(14/21에 위아래 2px) = 87px다.
- Focused(`focus-within`): 카드 테두리가 `primitive-gray-700`(`#25282D`)로 진해지고 안내 문구가 숨겨져 캐럿만 보인다(Figma의 `border-strong`은 repo에 없고 같은 값의 gray-700을 `TextField`처럼 쓴다).
- Filled: 입력 글자는 `typography-body-2-regular`(14/21) `text-secondary`(`#25282D`).
- Error: 값은 Filled와 같고 카드 아래 4px(`s2`)에 오류 문구(`typography-caption-1-medium` 12/16, +0.25px, `system-fail-text` `#F04D29`, 줄 높이 22px)가 나온다. 입력창은 `aria-invalid`다. 두 줄 코멘트면 카드 높이가 108px, 전체 134px다.
- Editing: `EditingAnimation`(30×25)을 머리 줄 아래 8px에 놓고 입력창은 `display: none`으로 숨긴다. 카드 높이는 87px다. 입력창에 포커스가 있을 때 `editing`이 켜지면 입력창이 숨겨지며 포커스가 `body`로 떨어지므로, 호출하는 쪽이 그 사이 포커스를 어디로 옮길지 정한다(이 컴포넌트는 포커스를 옮기지 않는다). `editing`이 꺼지면 입력창이 다시 나타나며 높이를 다시 맞춘다.
- iOS: 포커스 시 확대를 막기 위해 16px로 렌더링한 뒤 14px 크기로 줄이는 `inputScale.textareaSlot`을 `LabeledTextArea`와 같이 쓴다.

## 접근성

- Semantic element: native `<textarea>`(`rows=1`, 줄바꿈되며 높이 증가, 크기 조절 손잡이 없음).
- Accessible name·label: "{이름} 코멘트"(기본, `currentUser`면 "{이름} (나) 코멘트", `label`로 변경). 프로필 사진은 이름 옆에 있어 장식(`alt=""`)이다.
- 오류: 입력창이 `aria-invalid`이고 `aria-describedby`가 보이는 오류 문구를 가리킨다. 오류 읽기는 처음부터 있는 `role="status"` 영역이 맡고 보이는 문구는 `aria-hidden`이라 한 번만 읽힌다(`LabeledTextArea`와 같은 방식).
- Editing: 애니메이션은 `editingLabel`을 주면 이미지로 읽히고 없으면 장식이다. 값이 바뀌어 읽히는 알림은 아니므로, 작성 상태 변화를 알리려면 호출하는 쪽이 `role="status"` 영역을 따로 둔다.
- Keyboard·focus: Tab으로 입력창에 들어가고 포커스 윤곽선은 카드 테두리가 진해지는 것으로 보인다(`focus:outline-none`). 강제 색상 모드에서는 `focus-within`에 `outline-2`(`TextField`와 같은 방식)를 둔다. 포커스 표시가 1px 테두리 색 변화(`#EAEAEA`→`#25282D`, 흰 배경에서 14.8:1)뿐이라 저시력 사용자에게는 약할 수 있다. `TextField`와 같은 방식이라 일관성을 따랐고 더 강한 표시(예: 2px 링)가 필요한지는 디자이너 확인이 필요하다.
- 색 대비(토큰 hex로 계산): 이름 `#121212` on `#FFFFFF` 18.7:1, 입력 `#25282D` on `#FFFFFF` 14.8:1, 오류 `#F04D29` on `#FFFFFF` 3.6:1, 안내 문구 `#BCBEC2` on `#FFFFFF` 1.9:1. 오류 문구(12px)는 일반 텍스트 AA(4.5:1)에, 안내 문구는 AA에 못 미친다(Figma 값, 확인할 항목). 카드 테두리 `#EAEAEA`(1.2:1)는 비텍스트 대비 3:1에 못 미친다.

## Styling과 의존성

- Token: `bg-surface-primary`, `border-border-tertiary`, `rounded-r5`, `px-padding-p7`·`py-s7`·`gap-s4`·`gap-s3`·`gap-s2`·`gap-s1`, `typography-body-1-medium`·`typography-body-2-regular`·`typography-caption-1-medium`, `text-text-primary`·`text-text-secondary`·`text-text-quaternary`·`text-system-fail-text`, `border-primitive-gray-700`. 허용되는 dependency 추가 없음.
- 입력창 높이 자동 맞춤은 `labeledTextField/useTextareaAutoHeight.internal.ts`를 쓴다(`LabeledTextArea`도 같은 hook으로 바꿨고 동작은 그대로다).
- Figma 이름 대응: `State=Default·Focused·Filled`→입력 상태, `State=Error`→`error`, `State=Editing`→`editing`, `currentUser`→`currentUser`, `userName`→`userName`.
- Storybook state matrix: `Default`, `Filled`, `Error`, `Editing`, `OtherMember`, `Interactive`.

## 확인할 항목

- 오류 문구 대비 3.6:1과 안내 문구 대비 1.9:1(위 접근성 항목). 디자이너 확인이 필요하다.
- Figma의 `State=Error` 카드는 테두리가 빨갛지 않고(`border-tertiary`) 문구만 빨갛다. 그대로 따랐다.
- 이름 색은 Figma가 변수가 아닌 순수 검정이라 가장 가까운 `text-primary`(`#121212`)를 썼다.
- `Focused` 테두리는 `border-strong`(Figma)을 같은 값의 `primitive-gray-700`으로 옮겼다.
- 코멘트 입력의 글자 수 제한 방식(예: `maxLength`로 막을지, 넘으면 `error`만 보여 줄지)은 정의가 없어 호출하는 쪽이 정한다.
- 안내 문구 "코멘트를 남기면 번들을 발행할 수 있어요."는 발행 조건을 알리는 유일한 시각 안내인데 대비가 1.9:1이고 포커스하면 사라진다. 입력창의 접근성 이름은 안내 문구가 아니라 "{이름} 코멘트"라 스크린 리더에는 이 조건이 전달되지 않으므로, 필요하면 호출하는 쪽이 화면에 별도 안내를 둔다.

## 검증

단위 테스트(이름·"(나)"·프로필·입력창 이름, 안내 문구, 오류 안내와 `aria-invalid`·status 한 번 읽힘, Editing의 애니메이션과 입력창 복귀, 클래스, id 파생)와 `LabeledTextArea` 기존 테스트(공유 hook으로 바꾼 뒤에도 통과)를 확인했다. Storybook을 빌드해 Figma 값과 대조했다: Default·Filled·Editing 344×87, Error 344×134(카드 108, 오류 안내 y 112 높이 22), 프로필 24px(15, 15), 이름 16/24 500 자간 -0.25 `#121212`, 입력 14/21 `#25282D`(높이 25, 두 줄은 46), 오류 12/16 500 자간 0.25 `#F04D29`, `EditingAnimation` 30×25(15, 47). 글자 픽셀은 Pretendard가 없어 비교하지 않았고 포커스 시 테두리 색은 Playwright로 눌러서 재지 않았다(클래스만 확인). 스크린 리더, 실기기 터치, 키보드 포커스 모양, 강제 색상 모드는 확인하지 않았다.
