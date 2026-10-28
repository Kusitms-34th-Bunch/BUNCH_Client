# 컴포넌트: BundleTextInput

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기·스크린 리더 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `BundleTextInput`(node `1303:16720`, 변형 `Property 1=Default` 한 가지). 이슈 #90.
- 조합하는 컴포넌트: `web/bundleTitle`의 `BundleTitle`(제목 줄), `core/textField`의 `TextField`(기본 변형, 지우기·버튼 없음).

## 목적과 범위

### 제공하는 동작

- 번들 작성 화면에서 쓰는 한 줄 입력: 위쪽에 `BundleTitle`(위치 핀·제목·선택적 필수 별표·멤버 아바타), 가운데 입력창, 아래에 오류 문구를 둔다.
- 간격은 제목과 입력창 사이 6px(`s3`), 입력창과 오류 문구 사이 4px(`s2`). 오류 문구는 `caption-1-medium`(12/16, +0.25), `system-fail-text`, 줄 높이 22px 영역에 세로 가운데로 둔다.
- 폭은 부모를 채운다(Figma 344px).

### 제공하지 않는 동작

- 글자 수 제한·검증·오류 문구 결정은 호출하는 쪽이 한다(Figma 문구 "입력 가능한 글자수를 초과했어요"는 예시일 뿐 컴포넌트에 고정하지 않음).
- 오류일 때 입력창 테두리를 바꾸지 않는다(Figma 오류 예시도 기본 테두리).
- 글자 수 `현재/최대` 표시는 Figma에 없어 만들지 않는다.
- 지우기·버튼·`editing` 변형과 `disabled`는 받지 않는다(Figma 변형이 Default 하나뿐이고, 비활성이면 제목·오류 문구까지 같이 흐려지는 규칙이 정의돼 있지 않음).

## Public API

- `title`(필수), `icon`·`required`·`requiredLabel`·`members`·`membersLabel`(`BundleTitle`에 그대로 전달), `errorMessage`, `className`(전체에 적용), 그리고 native `input` 속성(`value`·`defaultValue`·`onChange`·`placeholder`·`maxLength`·`id` 등. `label`·`action`·`onClear`·`clearLabel`·`editing`·`editingLabel`·`aria-labelledby`·`disabled` 제외).
- 호출자 소유 책임: 값, 검증, 오류 문구, 멤버 데이터.

## 상태와 동작

- 입력창 상태(기본·포커스·값 있음)는 core `TextField`를 따른다(`TextField.spec.md`).
- `errorMessage`가 있으면 오류 문구를 보이고, 없으면 오류 영역을 그리지 않는다(Figma `showErrorText`).

## 접근성

- 입력창의 접근성 이름은 `BundleTitle`의 제목 글자(`aria-labelledby`)다. 필수 안내 글자와 멤버 아바타 이름은 제목 글자 요소 밖이라 이름에 섞이지 않는다.
- `errorMessage`가 있으면 오류 문구는 `role="alert"`로 알려지고 입력창은 `aria-invalid`와 `aria-describedby`(오류 문구 id + 호출자가 준 값)로 연결된다.
- `required`면 입력창에 `aria-required`를 주고, 별표는 장식이며 "필수" 안내 글자를 화면 밖에 둔다(`BundleTitle`).
- 위치 핀 아이콘은 장식(`aria-hidden`)이다. 멤버 아바타는 `BundleTitle`의 목록(`membersLabel`)이다.
- 포커스·터치 영역은 core `TextField`(높이 48px)를 따른다.
- 오류 문구 대비: `#f04d29` 글자는 흰 배경에서 약 3.6:1로 AA(4.5:1) 미달이다. Figma 값이라 그대로 두고 디자이너 확인 항목으로 둔다. 오류는 색 외에 문구와 `aria-invalid`로도 전달한다.
- 제목은 `<label>`이 아니라 `<span>`(`BundleTitle`)이라 제목을 눌러도 입력창에 포커스가 가지 않는다(접근성 이름에는 영향 없음). `LabeledTextField`의 `<label htmlFor>`와 다른 점이다.

## Styling과 의존성

- Token: `gap-s2`·`gap-s3`, `typography-caption-1-medium`, `text-system-fail-text`, 높이 22px은 기본 scale `min-h-5.5`. 나머지는 `BundleTitle`·`TextField`의 token을 그대로 쓴다.
- 높이: core `TextField`가 48px이라 전체가 105px이다(Figma 프레임은 입력창 47px로 104px, 반올림 차이로 보임). 별도 보정은 하지 않았다.
- dependency 추가 없음.
- Storybook: `Web/BundleTextInput`(Default, Figma, WithError, Required, Interactive).

## 디자이너 확인 항목

- 오류 문구 대비 3.6:1(위).
- 오류일 때 입력창 테두리·배경 변화가 없는 것이 의도인지(다른 오류 입력은 아직 Figma 정의 없음).
