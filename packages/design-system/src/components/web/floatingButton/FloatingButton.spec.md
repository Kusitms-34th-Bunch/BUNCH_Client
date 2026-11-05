# 컴포넌트: FloatingButton

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 화면 위에 떠 있는 BUNCH 사용자 앱의 더보기 버튼이라 `web`에 둔다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `FloatingButton`(node `1482:12921`). Figma `Status=Disabled / Default / Pressed`를 아래 "상태와 동작"으로 옮겼다.
- 이슈: #80

## 목적과 범위

### 제공하는 동작

- 52px 원형 아이콘 버튼. 흰 배경에 그림자가 있고 가운데에 점 세 개(`Line/Icon-L/dots`, 24px) 아이콘이 있다. 눌러서 더보기 메뉴 등을 여는 용도다. 화면 디자인에는 더하기(+) 아이콘 형태도 있어 `icon` prop으로 고른다.
- 기본, 눌림(`:active`), 비활성(`disabled`) 상태.

### 제공하지 않는 동작

- 화면 위에 띄우는 위치(`fixed`, 오른쪽·아래 여백)와 메뉴 열기. 호출하는 쪽이 `className`으로 위치를 주고 `onClick`을 처리한다. Figma에 배치 값이 없다.
- 임의 아이콘 교체. `icon`은 `more`(점 세 개, 기본)와 `add`(더하기) 두 가지만 받는다.
- hover 모양. Figma에 없다.

## Public API

- Props: `aria-label`(필수, 접근성 이름), 그리고 native `<button>`의 속성(`onClick`, `disabled`, `type`, `className` 등. `children`은 받지 않는다). 기본 `type`은 `button`이다.
- 호출자 소유 책임: 접근성 이름 문구(예: "더보기"). 타입은 빈 문자열을 막지 못하므로 비어 있지 않은 문구여야 한다(`CameraButton`도 같다). 클릭 동작, 화면 위의 위치.
- 포커스된 버튼이 `disabled`가 되면 일부 브라우저에서 포커스가 `body`로 빠지므로, 처리가 끝나면 포커스를 복원하는 것도 호출하는 쪽이 맡는다.
- `fixed`로 띄울 때는 마지막 콘텐츠가 가려지지 않게 스크롤 영역 아래 여백을 확보하고, DOM 순서를 시각적 흐름에 맞춘다.

## 상태와 동작

- Default: 흰 배경(`surface-primary`) + 그림자, 아이콘 `icon-primary`(`#121212`).
- Pressed(`:active`): 버튼 배경에 `overlay-pressed`(검정 20%)를 배경 층으로 깐다. 아이콘은 어두워지지 않는다. 75ms Ease Out 전환(동작 줄이기에서는 끔).
- Disabled(`disabled`): 그림자까지 포함한 전체에 `opacity-disabled`(40%)와 `cursor-not-allowed`, 아이콘은 `icon-disabled`(`#bcbec2`). 눌러도 동작하지 않는다.
- 크기: 52×52px, 안쪽 여백 10px(24px 아이콘을 가운데에 둔다).
- 그림자: `0 4px 6px rgba(0,0,0,0.12)`.

## 접근성

- Semantic element: native `<button type="button">`. 아이콘은 `aria-hidden`이고 이름은 `aria-label`이 준다.
- Keyboard·focus: Tab으로 들어오고 Enter·Space로 누른다. 포커스 윤곽선은 바깥 2px `border-brand`다. 비활성은 native `disabled`라 포커스와 클릭이 모두 막힌다.
- 터치 영역: 52px라 별도 확장이 필요 없다. `touch-manipulation`을 적용했다.
- 색 대비: 아이콘 `#121212`가 흰 배경 위에 놓여 충분하다. 흰 버튼이 흰 화면 위에 놓이면 그림자만으로 경계를 구분해 비텍스트 대비(WCAG 1.4.11)가 약할 수 있다(확인할 항목). 비활성은 대비 요구에서 제외되지만 40% 투명이 그림자까지 옅게 만들어 경계가 더 흐려진다.

## Styling과 의존성

| Figma     | 값                                 | 사용한 토큰·utility                                                                         |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| 크기·반경 | 52px, radius full                  | `size-13 rounded-full`                                                                      |
| 배경      | 흰색                               | `bg-surface-primary`                                                                        |
| 그림자    | 0 4 6 `rgba(0,0,0,0.12)`           | `shadow-[0_4px_6px_rgba(0,0,0,0.12)]`(토큰 없음)                                            |
| 아이콘    | `Line/Icon-L/dots` 24px, `#121212` | `LineDotsLargeIcon`(`icon="more"`) / `LineAddLargeIcon`(`icon="add"`) + `text-icon-primary` |
| 눌림      | 검정 20%                           | `bg-overlay-pressed`(배경 층)                                                               |
| 비활성    | 전체 40% 투명, 아이콘 `#BCBEC2`    | `opacity-(--semantic-opacity-disabled)`, `text-icon-disabled`                               |

- 눌림 오버레이는 `isolate`와 `before:-z-10`으로 버튼 배경 위, 아이콘 아래에 깐다. `CameraButton`은 아이콘 위까지 덮지만 Figma의 이 버튼은 배경에만 그려져 있어 배경 층으로 했다.
- dependency 추가 없음. 아이콘은 기존 `LineDotsLargeIcon`, `LineAddLargeIcon`을 쓴다.
- Storybook state matrix: `Default`, `Disabled`, 두 상태를 나란히 보는 `States`, 화면 오른쪽 아래에 띄운 예 `Floating`. 눌림은 `:active`라 정지 화면으로 만들 수 없어 story로 두지 않았다.

## 확인할 항목

- 그림자 토큰 (제안): Figma 그림자(`0 4 6 12%`)에 대응하는 토큰이 없어 임의 값을 썼다. 토큰 승격이 필요하면 디자이너와 정한다.
- 아이콘 (제안): Figma 컴포넌트에는 점 세 개 하나뿐이지만 화면 디자인에 더하기 형태가 있어 `icon: 'more' | 'add'`로 열었다. 더하기 아이콘의 Figma 컴포넌트 정의는 없어 같은 크기·색을 적용했다(디자이너 확인 항목).
- 이름 (제안): Figma 이름 `FloatingButton`을 그대로 썼다. 팀원이 제안한 `MoreButton`은 더하기 형태가 있어 쓰지 않았다. 점 세 개가 "더보기"를 뜻한다고 보지만 Figma가 용도를 정의하지 않아 `aria-label`은 호출하는 쪽이 정한다.
- 눌림 범위 (확인): Figma Pressed의 오버레이를 버튼 배경에만 그려져 있는 것으로 읽었다(아이콘 제외).
- 위치·그림자 잘림 (미정): 부모에 `overflow: hidden`이 있으면 그림자가 잘린다. 쓰는 화면에서 확인한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/web/floatingButton`(8개 통과), `gen:index:check`, Prettier 통과.

Storybook을 빌드해 Chrome에서 Figma 4배 내보내기(배경 `#3A3A3A`)와 Disabled·Default·Pressed(마우스를 누른 채)를 비교했다. 버튼 면은 색이 같고(차이 0), 아이콘 점의 색과 위치는 안티앨리어싱 수준(평균 채널 차이 0.3~0.4)이며, 그림자와 가장자리도 거의 같다. 비활성은 배경 `#898989`·아이콘 `#6E6F70` 계열로 같고 눌림은 `#CCCCCC`로 같다. 키보드 포커스 링의 실제 모양, 스크린 리더, 실기기 터치, 강제 색상 모드는 확인하지 않았다.
