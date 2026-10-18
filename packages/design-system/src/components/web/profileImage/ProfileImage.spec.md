# 컴포넌트: ProfileImage

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 스크린샷과 눈으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Profile Image`(node `796:4797`). Figma의 `Default` / `Output` 상태는 `src` 하나로 표현한다.
- 화면 설계서: `화면 설계서 - 로그인, 이용약관, 프로필 작성`(node `796:9226`)의 프로필 작성 화면 2번 "Profile"(node `796:6629`).

## 목적과 범위

### 제공하는 동작

- 90px 원형 이미지. 프로필 작성 화면에서 "최초 진입 시 기본 프로필 이미지(번치 대표 이미지)", "이미지 등록 후에는 선택한 이미지"로 바뀐다.
- `BunchAvatar`와 같은 방식으로 이미지는 호출하는 쪽이 `src`로 넘긴다. 기본 이미지든 선택한 이미지든 이 컴포넌트는 `src`를 그릴 뿐이다.
- `src`가 없으면 `surface-brand-subtle-2`(Figma `Default`의 배경색) 원만 보인다.

### 제공하지 않는 동작

- 카메라 버튼은 그리지 않는다. 설계서가 `Profile Image + Cam Button-S` 두 컴포넌트를 함께 쓰라고 하므로, 화면이 `CameraButton`을 오른쪽 아래(95×90 영역에서 67·62 위치)에 겹쳐 놓는다(`Web/ProfileImage`의 `WithCameraButton` story).
- 기본 이미지(번치 대표 이미지) 에셋은 갖지 않는다. 호출하는 쪽이 넘긴다.
- 이미지 선택·촬영·업로드·로딩 상태는 화면이 맡는다. 이미지 등록은 선택 사항이다(설계서).

## Public API

- Props: `src`, `alt`(기본 빈 문자열 = 장식), 그리고 native `<div>` 속성(`className` 등. `children`은 받지 않는다).
- 호출자 소유 책임: 기본·선택 이미지 주소, 이미지 설명 문구(프로필 이미지가 사용자를 식별하는 유일한 단서인 화면에서는 `alt`를 넘긴다), 카메라 버튼 배치, 이미지 로드 실패 시 대체 처리.

## 상태와 동작

- 이미지: `object-cover`로 원을 채우고 원 밖은 잘린다.
- 이미지 없음: 배경색 원만 보인다.
- 로딩·에러 상태는 디자인에 없어서 만들지 않았다. 이미지 로드에 실패하면 깨진 이미지가 보일 수 있다(`onError` 대체는 만들지 않음).
- `src`가 없으면 `<img>`를 그리지 않으므로 `alt`만 넘겨도 아무것도 읽히지 않는다.

## 접근성

- Semantic element: `<img>`가 `div` 안에 있다. `alt`를 주면 이미지 이름이 되고, 비우면 장식으로 숨겨진다.
- 프로필 이미지는 의미 있는 정보일 때만 `alt`를 넘긴다(예: 사용자 이름이 따로 보이면 장식으로 둔다).
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.

## Styling과 의존성

- Token: `bg-surface-brand-subtle-2`, `rounded-full`. 크기 `size-22.5`(90px)는 토큰에 없어 기본 scale을 쓴다(`BunchAvatar`와 같은 방식). dependency 추가 없음.
- Storybook state matrix: `Default`, `Picked`, `NoImage`, `WithCameraButton`.

## 확인할 항목

- 기본 이미지 위치·확대 (제안): Figma `Default`는 번치 대표 이미지를 원보다 크게(가로 119%, 세로 115%, 위로 13% 내려) 놓았다. 이미지는 호출자가 넘기므로 `object-cover` 가운데 맞춤만 했다. 기본 이미지가 이 구도로 보여야 하면 이미지 에셋 쪽을 조정하거나 `className`으로 정한다.
- 상태 표현 (제안): Figma의 `Default` / `Output`을 별도 prop 없이 `src`로 표현했다. 기본 이미지와 선택 이미지를 구분해야 하는 동작이 생기면 호출하는 쪽에서 `src`를 바꾼다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `profileImage` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(303 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인(Figma 스크린샷과 눈 대조). Pressed·포커스·픽셀 단위 대조·실기기는 미검증
