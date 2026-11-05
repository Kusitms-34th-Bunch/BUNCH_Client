# 컴포넌트: InviteCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(Storybook 렌더를 Figma 값과 측정으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `온보딩 컴포넌트` 안 `InviteCard`(node `720:4746`).

## 목적과 범위

### 제공하는 동작

- 번치 초대장: 번치 이름(제목), 소개, 대표 이미지(167px 원), 보낸 사람(「From. 이름 님」), 「참여하기」 버튼을 세로로 쌓는다. 흰 카드, radius 16, 약한 그림자.
- 「참여하기」는 기존 `Button`(primary, lg)을 쓴다. Figma의 SolidButton과 같은 모양이다.

### 제공하지 않는 동작

- 참여 처리, 초대 정보 조회, route, 로그인 분기. 호출하는 쪽이 `onJoin`에서 한다.
- 카메라 버튼. 이미지는 보여 주기만 한다(`BunchAvatar`와 다르다).

## Public API

- 이름 연결: `aria-labelledby`는 번치 이름 `h2`로 고정이라 받지 않는다(타입에서 제외).
- Props: `bunchName`, `description`, `senderName`(필수), `imageSrc`, `imageAlt`(기본 빈 문자열), `onJoin`, 그리고 native `<article>` 속성(`className`, `id` 등). `title`은 받지 않는다.
- 호출자 소유 책임: 번치 이름·소개·보낸 사람 이름, 이미지 주소, 참여 동작. 「From.」·「님」·「참여하기」 문구는 컴포넌트에 고정이라 i18n은 확인할 항목이다.

## 상태와 동작

- 이미지 없음(`imageSrc` 없음): 이미지 없이 빈 원(`surface-secondary`). Figma에 정의된 상태가 아니다.
- 긴 번치 이름·소개: 줄바꿈되고 카드 높이가 늘어난다. 보낸 사람 줄은 한 줄(`nowrap`)이라 이름이 길면 넘칠 수 있다(Figma 설정 그대로).
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: `<article>`이고 이름은 번치 이름 `h2`(`aria-labelledby`)다. `h2`라 화면 제목(`h1`) 아래에서 쓴다.
- 이미지: `imageAlt`를 주면 `img`, 비우면 장식으로 숨겨진다.
- 「참여하기」는 native `<button>`이다. Keyboard·focus는 `Button`을 따른다.
- 「From. 이름 님」은 span 사이 공백 문자로 접근성 텍스트에 공백이 있다(시각 간격은 2px gap 그대로).
- 카드를 여러 개 그려도 제목 연결이 섞이지 않는다(자동 id, `id`를 넘기면 `<id>-name`).

## Styling과 의존성

| Figma        | 값                                              | 사용한 토큰·utility                                        |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------- |
| 카드         | 295 폭, radius 16, 흰색                         | `w-full rounded-r8 bg-surface-primary`(폭은 호출자가 정함) |
| 카드 padding | 위 40, 좌우·아래 16                             | `pt-s16 px-s8 pb-s8`                                       |
| 섹션 간격    | 위 묶음과 버튼 사이 26                          | `gap-6.5`(토큰 없음, 기본 scale)                           |
| 위 묶음 간격 | 32                                              | `gap-s14`                                                  |
| 그림자       | 0 2 5 rgba(0,0,0,0.04)                          | `shadow-[0_2px_5px_rgba(0,0,0,0.04)]`(토큰 없음)           |
| 번치 이름    | Title-1-SemiBold(22/28, -0.25), `text-primary`  | `typography-title-1-semi-bold text-text-primary`           |
| 소개         | Body-1-Medium(16/24, -0.25), `text-secondary`   | `typography-body-1-medium text-text-secondary`             |
| 이미지       | 167 원                                          | `size-41.75 rounded-full`(토큰 없음, 기본 scale)           |
| 보낸 사람    | Body-1-SemiBold(16/24), `text-tertiary`, 간격 2 | `typography-body-1-semi-bold text-text-tertiary gap-s1`    |
| 참여하기     | SolidButton(48, `surface-inversed`, 17/26)      | `Button`(primary, lg)                                      |

- dependency 추가 없음. `core`의 `Button`을 import한다(web은 core를 쓸 수 있다).
- Storybook state matrix: 기본, 이미지 없음, 긴 텍스트, 좁은 폭(280px).

## 확인할 항목

- 말줄임의 접근성 한계 (설계서대로): 말줄임되면 시각 사용자는 전체를 볼 방법이 없다(스크린 리더는 전체를 읽는다). 「더보기」나 줄 수 제한 해제는 디자이너와 협의한다(`BunchJoinInvitation.spec.md`).
- 소개 줄 수 (확정, 2026-10-19): Figma `Bunch/Join/Invitation`의 긴 소개(node `875:5962`)가 2줄에서 말줄임(…)이라 `line-clamp-2`로 맞췄다. 한 줄 고정이 아니다.
- 보낸 사람 줄 (확정 필요): 한 줄 고정(Figma `whitespace-nowrap`)이라 긴 이름이 카드 밖으로 넘칠 수 있다. 말줄임·줄바꿈 중 처리 방식을 디자이너와 협의한다. 협의 전에는 Figma에 없는 표시를 더하지 않는다.
- 토큰 없는 값 (제안): 그림자, 간격 26, 이미지 167은 토큰이 없어 임의 값·기본 scale을 썼다. 토큰 승격 여부 디자이너 확인.
- 이미지 없음 상태 (제안): Figma에 없다. 빈 원을 그렸다. 기본 이미지는 호출하는 쪽이 넘긴다.
- 문구 (제안): 「From.」·「님」·「참여하기」가 컴포넌트에 고정이다. 다국어가 필요해지면 props로 뺀다.
- 사용 화면 (미정): 웹 초대장(비로그인) 등 이 카드를 쓰는 화면의 화면설계서는 받지 못했다.
- 호버·눌림 (미정): `Button`의 눌림만 있고 카드에는 Figma 정의가 없다.

## 검증

- [x] 사용자 관찰 동작 test(제목·article, 소개·보낸 사람, 참여하기 클릭, 이미지 있음·없음, 카드 여러 개, className)
- [x] 지원 상태 story
- [x] public export 영향 확인
- [x] `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated` 통과
- [x] Storybook 빌드를 headless Chromium에서 측정해 카드·글자·이미지·버튼 크기와 색을 Figma와 대조
- [ ] 픽셀 단위 비교, 실기기(iOS WebView), 스크린 리더 낭독은 미검증
