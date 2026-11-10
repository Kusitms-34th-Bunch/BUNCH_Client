# 컴포넌트: BunchAccordion

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 번치 하나를 펼치고 접는 카드로, BUNCH 앱 화면에서만 의미가 있다.
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `MY 컴포넌트` 안 `Bunch_Accordion`(node `3949:75471`, 열림·닫힘)과 `Bunch_Accordion_Status`(node `3949:75535`, 비활성·기본·눌림·선택(`4821:87460`, 2026-11-07 추가)). 두 세트가 같은 행의 상태라 컴포넌트 하나로 만들었다.
- 사용 화면: 화면 설계서 MY의 탈퇴하기 관리자 권한 이전(번치별 멤버 목록을 펼쳐 새 관리자를 고름)
- 이슈: #206

## 목적과 범위

### 제공하는 동작

- 번치 이미지(`ProfileImage` S)·이름·쉐브론으로 된 헤더 버튼. 누르면 구분선과 내용을 펼치고, 다시 누르면 접는다.
- 상태: 닫힘·열림 × 기본·눌림(누르는 동안)·비활성.
- 전환: 높이를 200ms ease-out으로 바꾼다(화면 설계서 `On Click / Smart Animate / Ease out / 200ms`). 동작 줄이기에서는 바로 바뀐다.

### 제공하지 않는 동작

- 펼친 안쪽 내용과 여백. 멤버 목록·선택 컨트롤은 화면이 `children`으로 넣는다.
- 여러 카드 중 하나만 열기. 카드마다 따로 열고 닫는다.
- 기존 `Accordion`(제목·개수형)과는 헤더 모양이 달라 함께 쓰지 않는다.

## Public API

- Props: `name`(번치 이름, 필수), `imageSrc?`, `open?`·`defaultOpen?`·`onOpenChange?`, `disabled?`, `headingLevel?`(기본 3), `children?`. 그 밖의 `div` 속성과 `className`은 카드에 적용한다.
- 제어 방식: `open` + `onOpenChange` 또는 `defaultOpen`. 둘 사이 전환은 지원하지 않는다.

## 상태와 동작

- 기본: 흰 카드, 1px `border-tertiary`, radius 8. 쉐브론은 닫힘이 아래, 열림이 위.
- 눌림: 헤더에 `overlay-hover`(10%)를 겹친다.
- 비활성: 카드 전체 `opacity-(--semantic-opacity-disabled)`(40%), 버튼 `disabled`. 펼친 채 비활성이면 내용도 `inert`로 막는다.
- 긴 이름: 한 줄 말줄임, 쉐브론은 줄어들지 않는다.
- 닫는 동안 내용은 `inert`로 포커스·읽기에서 바로 빠지고, 전환이 끝나면 `hidden`이 된다.

- 선택(`selected`): 안에서 무언가 고른 뒤 **접혔을 때만** 연한 브랜드 배경(`surface-brand-subtle-1`), 브랜드 테두리(`border-brand-subtle`), 쉐브론 `chip-blue-fg`(#777FF2)로 보인다. 펼치면 안의 선택 표시(라디오 등)가 보이므로 기본 모양으로 돌아간다. 선택 모양과 기본 모양 사이는 Dissolve·Ease out·200ms로 바뀐다(배경·테두리 색, 동작 줄이기면 즉시). 쉐브론은 열고 닫을 때 위·아래 아이콘을 바꿔 그리므로 색도 그 순간 바뀐다. 고른 값은 `selectedLabel`로 펼침 버튼 이름 뒤에 읽힌다(색만으로 전하지 않음).

## 접근성

- 헤더는 제목 요소(`h3` 기본) 안의 `button`. 이름은 번치 이름이고 `aria-expanded`로 열림을 알린다.
- 내용이 있으면 `aria-controls`로 내용 영역(`role="region"`, 이름은 헤더)과 연결한다. 내용이 없으면 연결하지 않는다.
- 번치 이미지는 이름이 옆에 있어 장식(`alt=""`)으로 둔다. 구분선은 `aria-hidden`이고 강제 색상 모드에서는 `CanvasText`로 그린다.
- 내용은 카드의 `overflow-hidden` 안에 있어 가장자리에 붙은 바깥쪽 포커스 윤곽선이 잘릴 수 있다. 내용의 포커스 윤곽선은 안쪽(`-outline-offset`)으로 그리거나 여백을 둔다.
- Keyboard·focus: Tab으로 들어가고 Enter·Space로 펼친다. 포커스 윤곽선은 헤더 안쪽 2px `border-brand`.

## Styling과 의존성

| Figma                 | 값                             | 사용한 토큰·utility                                                                                    |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 카드                  | 흰색, 안쪽 테두리 `#EAEAEA`, 8 | `bg-surface-primary rounded-r4`, `outline -outline-offset-1 outline-border-tertiary`(크기에 영향 없음) |
| 헤더 여백             | 좌우 12, 위아래 10             | `px-padding-p6 py-padding-p5`                                                                          |
| 이미지와 이름         | 40px, 테두리, 사이 6           | `ProfileImage size="S"` + `border`, `gap-s3`                                                           |
| 이름                  | Body-2-Medium `#25282D`        | `typography-body-2-medium text-text-secondary`                                                         |
| 쉐브론                | 20px `#BCBEC2`                 | `LineChevron{Down,Up}MediumIcon`, `text-icon-quaternary`                                               |
| 눌림                  | 10% 겹침                       | `bg-overlay-hover`                                                                                     |
| 헤더·구분선·내용 사이 | 8                              | `pt-s4 gap-s4`(패널 안쪽이라 닫힌 높이는 60 유지)                                                      |
| 구분선                | 1px `#EAEAEA`, 좌우 10 띄움    | `bg-border-tertiary mx-padding-p5`                                                                     |

- 의존: web `ProfileImage`. dependency 추가 없음.
- 높이 전환과 닫는 동안 `inert` 처리는 `Accordion`과 같은 방식이다.
- Storybook state matrix: Default·Open·Disabled·LongName·List(343px 폭).

## 확인할 항목

- 선택 상태의 시각 단서가 색뿐이다: 배경 #F1F2FF는 흰색 대비 1.1:1, 테두리 #A7ADFF는 2:1이라 저시력·색약 사용자는 놓칠 수 있다. 스크린 리더는 `selectedLabel`로 듣는다. 접힌 카드에 고른 이름을 보이는 등 보조 단서가 필요한지 디자인에 확인한다.
- 선택 상태의 쉐브론 (결정): Figma `Status=Selected`는 위쪽 쉐브론으로 그려져 있지만, 선택은 접힌 상태에만 보이므로 아래쪽을 유지한다(사용자 결정, 2026-11-09).
- 이름과 쉐브론 사이 (제안): Figma는 간격 126을 고정했다. 화면 폭이 달라져도 맞도록 이름이 남은 폭을 채우고 쉐브론을 오른쪽 끝에 붙였다.
- 열린 카드의 테두리 (제안): `Bunch_Accordion` 컴포넌트에는 테두리 두께가 0이지만, 화면 설계서의 카드는 닫힘·열림 모두 1px 테두리를 그린다. 화면 쪽 모양을 따랐다.
- 펼친 안쪽 위아래 여백: Figma 카드는 헤더·구분선·내용 사이만 8을 둔다. 내용 아래 여백은 내용을 넣는 화면이 정한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] Storybook 렌더와 Figma 대조(List·Disabled·LongName, 343×60·이미지 12·이름 6·쉐브론 12를 측정)
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`, `vitest run src/components/web/bunchAccordion`. Storybook 렌더를 Chrome에서 Figma 화면 설계서(탈퇴하기)와 눈으로 대조하고 치수를 쟀다. 눌림은 정지 화면이라 대조하지 않았다. 스크린 리더와 실기기는 확인하지 않았다.
