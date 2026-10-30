# 컴포넌트: PageHeader

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(Storybook 렌더를 Figma 스크린샷과 눈으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `PageHeader`(node `770:2664`). Figma의 progress·description boolean 조합 4가지를 slot과 선택 prop으로 표현한다.

## 목적과 범위

### 제공하는 동작

- 진행 표시(선택) · 제목 · 설명(선택)을 세로로 쌓는 화면 제목 영역. 위쪽 12px, 좌우 16px, 흰 배경.
- 4가지 구성: 진행 표시+제목+설명 / 진행 표시+제목 / 제목+설명 / 제목만.

### 제공하지 않는 동작

- 진행 표시 자체는 만들지 않는다. 호출자가 `Stepper`를 `progress`로 넘긴다.
- 뒤로 가기, 오른쪽 버튼 등 상단 바 요소는 `Header`가 맡는다.
- 아래쪽 padding은 Figma에 없어서 두지 않았다. 본문과의 간격은 호출자가 정한다.

## Public API

- Props: `title`(필수), `description`, `progress`, 그리고 native `<div>` 속성(`className` 등).
- 호출자 소유 책임: 제목·설명 문구, 진행 표시(`Stepper`의 단계 수·현재 단계), 아래쪽 간격.

## 상태와 동작

- 간격: 진행 표시와 제목 묶음 사이 28px, 제목과 설명 사이 4px(Figma의 구성 4가지 모두 같은 값).
- 긴 텍스트: 제목·설명은 줄바꿈되어 모두 보인다(`LongText` story).
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: 제목은 `h1`, 설명은 `p`. 화면당 `PageHeader`는 하나만 쓴다. 다른 `h1`(예: `Header`의 제목을 `h1`로 넘긴 경우)과 함께 쓰지 않는다.
- 진행 표시는 `Stepper`의 `progressbar`가 읽힌다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.

## Styling과 의존성

- Token: `px-padding-p8`(16), `pt-padding-p6`(12), `gap-s13`(28), `gap-s2`(4), `bg-surface-primary`, `typography-title-1-semi-bold`(22/28), `typography-body-3-regular`(14/21), `text-text-primary`, `text-text-tertiary`. dependency 추가 없음.
- Storybook state matrix: `ProgressTitleDescription`, `ProgressTitle`, `TitleDescription`, `TitleOnly`, `LongText`.

## 확인할 항목

- 줄바꿈 (제안): 한글이 단어 중간에서 끊기지 않도록 제목·설명에 `break-keep`을 썼다. Figma는 `break-word`다.
- 제목 색 (제안): Figma는 순수 검정(`black`)이다. `text-primary`(#121212)를 썼다. 값 차이는 미세하며 디자이너 확인.
- 배경 토큰 (제안): Figma `white`에 `surface-primary`를 썼다(`Header`와 같음).
- 제목 요소 (제안): 화면 제목이라 `h1`로 고정했다. 다른 heading 수준이 필요한 사용처가 생기면 prop으로 연다.
- 진행 표시 slot (제안): Figma는 boolean이지만 단계 수·현재 단계를 호출자가 정해야 하므로 `progress` slot으로 열었다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `pageHeader` export 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(217 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 이 변경과 무관)·`gen:index:check`
- [x] Storybook 렌더 확인(375·390px, Figma 스크린샷과 눈 대조). 픽셀 단위 대조와 실기기는 미검증
