# 컴포넌트: InviteMemberCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `온보딩 컴포넌트` 안 `InviteMemberCard`(node `640:3926`). 화면 맥락은 화면설계서(node `791:7675`·`791:8338`)를 따른다.

## 목적과 범위

### 제공하는 동작

- 멤버 초대 방식처럼 여러 카드 중 **하나만 고르는** 카드(「다음」 버튼으로 확정되는 흐름, 사용자 확인). 왼쪽 그래픽 아이콘(40px), 제목, 설명.

### 제공하지 않는 동작

- 선택 값 보관, 「다음」 버튼, 그룹 질문 문구. 호출하는 쪽이 정한다.
- 이 카드를 쓰는 화면의 화면설계서는 아직 받지 못했다(온보딩 앞 화면에는 없다).

## Public API

- Props: `title`, `description`, `icon`(필수), 그리고 `<input type="radio">`의 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `className` 등). `type`·`disabled`는 받지 않는다.
- Controlled / uncontrolled: 둘 다 가능.
- 호출자 소유 책임: 문구, `name`·`value`, 선택 값 상태, `fieldset`·`legend`, 아이콘 선택.

## 상태와 동작

- 기본: 연한 회색 카드. 선택: 카드 배경이 10% 어두워진다(원이 없어 카드만).
- 긴 텍스트: 제목·설명이 줄바꿈되고 카드 높이가 늘어난다.
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: 숨긴 `<input type="radio">`를 카드 `<label>`이 감싼다. 카드 어디를 눌러도 선택된다.
- Accessible name·label: 이름은 제목(`aria-labelledby`), 설명은 `aria-describedby`로 연결한다. 아이콘은 `aria-hidden` 래퍼 안에 있다.
- Keyboard·focus: 같은 `name`의 라디오 그룹은 Tab으로 들어가 방향키로 선택을 옮긴다. 포커스가 오면 카드 바깥에 2px `border-brand` 윤곽선이 보인다(`has-focus-visible`).
- 그룹 이름: 호출하는 쪽이 `fieldset`과 `legend`로 질문(예: 「공개 범위」)을 묶는다. 이 컴포넌트는 그룹을 만들지 않는다.

## Styling과 의존성

Figma 값과 토큰 대응(padding 토큰 `p7`·`p8`·`p10`·`p11`은 spacing 토큰 `s7`·`s8`·`s10`·`s11`과 같은 값이라 spacing utility를 썼다).

| Figma             | 값                                          | 사용한 토큰·utility                            |
| ----------------- | ------------------------------------------- | ---------------------------------------------- |
| 카드 padding·간격 | 20, 아이콘과 글 사이 16                     | `p-s10 gap-s8`                                 |
| 카드 radius       | 14                                          | `rounded-r7`                                   |
| 아이콘            | 40×40 그래픽 아이콘                         | 호출자가 넘기는 `GraphicPeopleIcon`            |
| 제목              | Body-1-Medium(16/24, -0.25), `text-primary` | `typography-body-1-medium text-text-primary`   |
| 설명              | Body-3-Regular(13/18), `text-tertiary`      | `typography-body-3-regular text-text-tertiary` |
| 제목·설명 간격    | 4                                           | `gap-s2`                                       |

- 선택 표시: Figma는 카드 배경 위에 검정 10% 레이어를 깐다(아이콘은 원색 그대로, 이 카드에는 흰 원이 없다). 같은 값의 토큰 `overlay-hover`(black alpha 10%)를 배경 layer로 겹친다.
- Storybook state matrix: 기본, 선택/눌림, 긴 텍스트, 좁은 폭(280px)· `Interactive`.
- dependency 추가 없음. 그래픽 아이콘은 호출자가 `icon`으로 넘긴다(`GraphicPeopleIcon`).

## 확인할 항목

- 설명 줄바꿈 (제안): Figma의 설명은 한 줄(nowrap)이다. 긴 문구가 넘치지 않게 줄바꿈을 허용했다. 디자이너 확인.
- 선택 의미 (제안): 「다음」 버튼이 있다는 설명에 따라 라디오로 구현했다. 화면설계서를 받으면 확인한다.
- 선택 표시 (확정 필요, 접근성): Figma가 선택을 배경 어두움(10%)으로만 정의해서 색만으로 선택이 전달된다. 비선택 회색과의 명도 차이가 작아 저시력·낮은 밝기·forced-colors(배경 그라디언트가 무시될 수 있음)에서 구분이 어려울 수 있다. 스크린 리더는 native radio 상태를 읽어 영향이 없다. 테두리·체크 표시 추가 여부를 디자이너와 협의한다. 협의 전에는 Figma에 없는 표시를 더하지 않고 그대로 둔다(forced-colors 모드 포함).
- `id` 계약 (제안): 호출자가 `id`를 넘기면 제목·설명 요소의 id(`<id>-title`, `<id>-description`)가 파생된다. 같은 id가 문서에 두 번 있으면 이름 연결이 어긋난다. 보통은 넘기지 않는다(자동 생성).
- 포커스 윤곽선 대비 (미검증): `border-brand` 윤곽선과 카드 배경의 대비, 마우스 클릭에는 보이지 않는지, 좁은 폭의 한글 줄바꿈은 실기기·렌더로 확인하지 못했다.
- 기본 배경 (제안): Figma 코드의 fallback은 `#f5f5f5`지만 토큰 `surface-secondary`는 `#f7f7f8`이다. 토큰을 기준으로 구현했다. 디자이너 확인.
- 선택·눌림 표시 토큰 (제안): Figma에서 변수 바인딩을 읽지 못했다. 값이 같은 `overlay-hover`를 골랐고 의미가 다르면(`overlay-pressed`는 20%라 다르다) 디자이너 확인.
- 호버·비활성 (미정): Figma에 없어서 구현하지 않았다. 비활성은 `disabled` prop을 받지 않는다.

## 검증

- [x] 사용자 관찰 동작 test(이름·설명, 클릭 선택, 아이콘 숨김, className). 방향키 그룹 이동과 controlled `checked`는 `VisibilityOption` 테스트가 같은 구조로 덮는다
- [x] 지원 상태 story
- [x] public export 영향 확인(`yarn gen:index`로 `web/index.ts`에 export 추가)
- [x] `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated` 통과
- [x] Storybook 빌드 렌더를 headless Chromium에서 측정해 Figma 값과 대조
- [ ] 픽셀 단위 비교, 실기기(iOS WebView) 렌더, 스크린 리더 낭독은 미검증
