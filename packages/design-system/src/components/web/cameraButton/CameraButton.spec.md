# 컴포넌트: CameraButton

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 스크린샷과 눈으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Cam Button - S`(node `796:4790`). Figma 이름 `Cam Button - S`를 `CameraButton`으로 옮겼다(크기가 S 하나뿐이라 size prop은 없다).
- 화면설계서: 프로필 작성 화면의 "Profile" 영역(설계서 프레임 `796:9226`, node `796:6629`).

## 목적과 범위

### 제공하는 동작

- 28px 원형 아이콘 버튼(카메라 아이콘 16px). 프로필 이미지 오른쪽 아래에 겹쳐 놓고 이미지 변경을 시작하는 용도다.
- 기본, 눌림(`:active`), 비활성(`disabled`) 상태.

### 제공하지 않는 동작

- 촬영·사진 선택·업로드는 화면(feature)이 맡는다. 설계서는 탭하면 이미지 등록 화면(카메라 촬영 / 사진 보관함 선택)으로 이동하고, 이미지 등록·처리 중에는 필요하면 버튼을 비활성으로 두라고 한다. 버튼은 `onClick`과 `disabled`만 제공한다.
- 다른 크기(M·L)는 디자인에 없어서 만들지 않았다.

## Public API

- Props: `aria-label`(필수, 접근성 이름), 그리고 native `<button>`의 속성(`onClick`, `disabled`, `type`, `className` 등. `children`은 받지 않는다).
- 기본 `type`은 `button`이다.
- 호출자 소유 책임: 접근성 이름 문구(예: "프로필 사진 변경". 비어 있지 않은 문구여야 한다), 클릭 동작, 프로필 이미지 위에 겹치는 위치(`absolute` 등), 처리 중 `disabled`. 포커스된 버튼이 `disabled`가 되면 일부 브라우저에서 포커스가 body로 빠지므로, 이미지 등록 화면에서 돌아올 때 포커스를 복원하는 것도 화면이 맡는다.

## 상태와 동작

- 눌림: 버튼 전체(배경과 아이콘)에 `overlay-pressed`(검정 20%) 오버레이, 75ms ease-out 전환(2026-10-22 디자이너 공통 지침 변경: Instant → 75ms). Figma 픽셀 실측으로 확인했다: 배경 `#535a61`→`#42484e`, 아이콘 흰색→`#cccccc`.
- 비활성: 전체에 `opacity-disabled`(40%)와 `cursor-not-allowed`, 아이콘은 `icon-disabled`(`#bcbec2`, Figma 아이콘 원본 값).
- 터치 영역: 보이는 크기는 28px이고, `after` 가상 요소로 40×40을 덮는다(`design-system-icons.md`의 Small 아이콘 터치 영역 40px). 비활성일 때는 `after`를 숨겨 아래 요소의 클릭을 막지 않는다.

## 접근성

- Semantic element: native `<button>`. 아이콘은 `aria-hidden`이고 이름은 `aria-label`이 준다.
- Keyboard·focus: Tab·Enter·Space와 `focus-visible` 링(다른 버튼과 같은 `outline-border-brand`).
- 비활성은 native `disabled`라 클릭과 키보드가 모두 막힌다.

## Styling과 의존성

- Token: `bg-icon-tertiary`(#535a61), `text-icon-inversed`, `rounded-full`, `before:bg-overlay-pressed`, `outline-border-brand`(focus), `--semantic-opacity-disabled`. 아이콘은 `FillCameraSmallIcon`(16px, 기존 아이콘).
- 크기 `size-7`(28px)과 `-inset-1.5`(6px)는 토큰에 없어 기본 scale을 쓴다(`BunchAvatar`와 같은 방식).
- dependency 추가 없음.
- Storybook state matrix: `Default`, `Disabled`, `States`. 프로필 이미지와 겹친 모습은 `Web/ProfileImage`의 `WithCameraButton`에서 본다.

## 확인할 항목

- 배경 토큰 (제안): Figma `surface-inversed-lighter`(#535a61)에 대응하는 토큰이 없어 같은 값의 `icon-tertiary`를 썼다(`BunchAvatar`의 카메라 버튼과 같음). 토큰 이름이 맞는지 디자이너 확인.
- 터치 영역 (제안): Small 아이콘 기준 40×40을 `after`로 확보했다. 이웃 요소의 터치 영역과 겹치지 않는지는 쓰는 화면에서 확인한다.
- 터치 영역이 부모 밖으로 나감 (제안): 프로필 이미지 95×90 영역 오른쪽 아래에 놓으면 40×40 영역이 오른쪽·아래로 6px씩 나간다. 쓰는 화면에서 `overflow`와 viewport 가장자리에서 잘리지 않는지, 프로필 이미지를 클릭 가능하게 만들 때 영역이 겹치지 않는지 확인한다(`ProfileImage`는 현재 비대화형이라 무해).
- 비텍스트 대비 (미검증): 진한 사진 위에서 `#535a61` 원이 묻힐 수 있다. 경계·포커스 링의 대비는 눈으로 확인하지 못했다.
- 이름 (제안): Figma 이름 `Cam Button - S`를 `CameraButton`으로 옮기고 S 크기는 이름에 넣지 않았다. M·L이 생기면 `size` prop을 연다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `cameraButton` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(303 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인(Figma 스크린샷과 눈 대조). Pressed·포커스·픽셀 단위 대조·실기기는 미검증
