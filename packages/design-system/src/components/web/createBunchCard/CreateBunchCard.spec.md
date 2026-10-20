# 컴포넌트: CreateBunchCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `온보딩 컴포넌트` 안 `CreateBunchCard`(node `633:2036`). 화면 맥락은 화면설계서(node `791:7675`·`791:8338`)를 따른다.

## 목적과 범위

### 제공하는 동작

- 번치 시작 방식 카드(「새 번치 만들기」, 「초대받은 번치 참여하기」). 화면설계서: 카드 전체 영역을 탭하면 해당 플로우의 첫 단계로 바로 이동한다(Navigate, Slide In, Ease In 200ms). 선택 상태와 「다음」 버튼이 없다.
- 위쪽 흰 원(69px) 안의 그래픽 아이콘, 제목, 설명을 가운데 정렬로 쌓는다.

### 제공하지 않는 동작

- 이동 자체(route, 화면 전환 애니메이션). 호출하는 쪽이 `onClick`에서 처리한다.
- 선택 상태. Figma의 `Selected=True` 변형은 선택이 아니라 **눌림** 표시로 해석했다(아래 확인할 항목).

## Public API

- Props: `title`, `description`, `icon`(필수), 그리고 native `<button>`의 속성(`onClick`, `className`, `ref` 등). `type`은 항상 `button`이다.
- 호출자 소유 책임: 문구, 이동 처리, 아이콘 선택.

## 상태와 동작

- 기본: 연한 회색 카드. 눌려 있는 동안(`:active`): 카드와 원 배경이 10% 어두워진다.
- 긴 텍스트: 제목·설명이 가운데 정렬로 줄바꿈되고 카드 높이가 늘어난다. Figma에 좌우 padding이 없어 글자가 카드 가장자리에 닿을 수 있다.
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: native `<button type="button">`. form 안에서 눌러도 제출하지 않는다.
- Accessible name·label: 제목과 설명이 이어져 이름이 된다(예: 「새 번치 만들기 친구들을 초대하고 …」). 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab으로 이동하고 Enter·Space로 누른다. 포커스 윤곽선 2px `border-brand`.
- 이동을 일으키므로 링크 의미가 더 맞을 수 있다. 호출하는 쪽이 `onClick`에서 이동하는 현재 구조는 버튼 의미다(확인할 항목).

## Styling과 의존성

Figma 값과 토큰 대응(padding 토큰 `p7`·`p8`·`p10`·`p11`은 spacing 토큰 `s7`·`s8`·`s10`·`s11`과 같은 값이라 spacing utility를 썼다).

| Figma             | 값                                              | 사용한 토큰·utility                                                      |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| 카드 padding·간격 | 위아래 22, 원과 글 사이 10                      | `py-s11 gap-s5`                                                          |
| 카드 radius       | 12                                              | `rounded-r6`                                                             |
| 아이콘 원         | 69×69, 흰색                                     | `size-17.25 rounded-full bg-surface-primary`(69px 토큰 없음, 기본 scale) |
| 제목              | Heading-2-Semibold(18/27, -0.5), `text-primary` | `typography-heading-2-semibold text-text-primary`                        |
| 설명              | Body-3-Regular(13/18), `text-tertiary`          | `typography-body-3-regular text-text-tertiary`                           |
| 제목·설명 간격    | 2                                               | `gap-s1`                                                                 |

- 선택·눌림 표시: Figma는 카드와 흰 원의 배경 위에 검정 10% 레이어를 깐다(아이콘은 원색 그대로). 같은 값의 토큰 `overlay-hover`(black alpha 10%)를 배경 layer로 겹친다.
- Storybook state matrix: 기본, 눌림(`Pressable`), 긴 텍스트, 좁은 폭(280px)· 눌림은 직접 눌러 확인.
- dependency 추가 없음. 그래픽 아이콘은 호출자가 `icon`으로 넘긴다(`GraphicEditIcon`).

## 확인할 항목

- Selected=True 해석 (제안): 화면설계서에서 이 카드는 선택 없이 바로 이동해서, Figma의 선택 변형을 눌림 표시로 구현했다. 디자이너 확인.
- 이동 의미 (미정): 탭하면 화면을 이동하므로 링크가 맞을 수 있다. 지금은 버튼이고 `onClick`에서 이동한다. 링크가 필요하면 렌더 방식을 props로 받게 바꾼다.
- 원 지름 69px (제안): 토큰에 없어 기본 scale을 썼다. 디자이너 확인.
- 문구·아이콘 (확정 필요): 화면설계서의 두 번째 카드 「초대받은 번치 참여하기」도 같은 컴포넌트(Edit 아이콘)이고 문구만 다르다. 아이콘이 같은 게 의도인지 확인.
- 포커스 윤곽선 대비 (미검증): `border-brand` 윤곽선과 카드 배경의 대비, 좁은 폭의 한글 줄바꿈은 확인하지 못했다.
- 기본 배경 (제안): Figma 코드의 fallback은 `#f5f5f5`지만 토큰 `surface-secondary`는 `#f7f7f8`이다. 토큰을 기준으로 구현했다. 디자이너 확인.
- 선택·눌림 표시 토큰 (제안): Figma에서 변수 바인딩을 읽지 못했다. 값이 같은 `overlay-hover`를 골랐고 의미가 다르면(`overlay-pressed`는 20%라 다르다) 디자이너 확인.
- 호버·비활성 (미정): Figma에 없어서 구현하지 않았다. 비활성은 `disabled` prop을 받지 않는다.

## 검증

- [x] 사용자 관찰 동작 test(이름·설명, 클릭·Enter·Space, form 제출 방지, 아이콘 숨김, className, ref)
- [x] 지원 상태 story
- [x] public export 영향 확인(`yarn gen:index`로 `web/index.ts`에 export 추가)
- [x] `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated` 통과
- [x] Storybook 빌드 렌더를 headless Chromium에서 측정해 Figma 값과 대조
- [ ] 픽셀 단위 비교, 실기기(iOS WebView) 렌더, 스크린 리더 낭독은 미검증
