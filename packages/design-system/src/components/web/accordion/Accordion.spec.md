# 컴포넌트: Accordion

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 개수 단위(「장」)처럼 BUNCH 사용자 앱의 사진 목록에서 쓰는 헤더라 `web`에 둔다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `Accordion`(node `1439:32627`). Figma `Open`·`Description`·`State`를 아래 "상태와 동작"으로 옮겼다. Figma 값 `Pessed`는 오타로 보고 `pressed`로 읽었다.
- 이슈: #78

## 목적과 범위

### 제공하는 동작

- 목록의 한 항목 헤더(제목, 선택적 개수, 선택적 설명, 쉐브론)를 눌러 안의 내용을 펼치고 접는다.
- 열림은 `open`(controlled) 또는 `defaultOpen`(uncontrolled)으로 정하고 바뀔 때 `onOpenChange`를 부른다.
- 펼친 내용은 `children`으로 받는다.

### 제공하지 않는 동작

- 펼친 내용의 모양. Figma에는 헤더만 정의돼 있고 펼친 영역이 없어 `children`을 그대로 그린다(여백·배경은 호출하는 쪽).
- 여러 항목 중 하나만 열리는 그룹 동작, 열고 닫는 전환 애니메이션(Figma에 없음).
- 개수·문구 계산과 i18n.

## Public API

- Props: `title`(필수), `description`, `count`, `open`, `defaultOpen`, `onOpenChange`, `headingLevel`(2~6, 기본 3, 타입 `AccordionHeadingLevel`), `children`, 그리고 native `<div>` 속성(`className` 등. `onChange`·`title`은 제외, `title`은 글자 prop으로 쓴다).
- `open`(controlled)과 `defaultOpen`(uncontrolled)은 한 가지만 쓴다. 한 인스턴스에서 `open`이 값과 `undefined` 사이를 오가는 전환은 지원하지 않는다.
- `children`이 없음(`undefined`·`null`·`false`)이면 내용 영역을 만들지 않는다. 빈 문자열이나 빈 배열은 내용으로 본다.
- `count`는 그대로 그려 준다. Figma의 「9장」은 호출하는 쪽이 `9장`으로 넘긴다.
- 호출자 소유 책임: 글자·개수 문구, 열림 상태(controlled인 경우), 펼친 내용, 제목 수준.

## 상태와 동작

- Figma 변형 6종: 닫힘 × 설명 있음/없음 × 기본/눌림, 열림 × 설명 있음/없음 × 기본.
- 설명이 있으면(Description=True) 제목이 18px SemiBold(`heading-2-semibold`, 줄 높이 27)이고 `count`(브랜드색)·설명(13px Regular, `text-tertiary`)을 보인다. 설명이 없으면 제목이 16px Medium(`body-1-medium`, 줄 높이 24)이다.
- 배경: 설명이 있거나 열려 있으면 `surface-secondary`, 닫혀 있고 설명이 없으면 `surface-primary`(흰색).
- 쉐브론: 닫힘은 아래(`LineChevronDownSmallIcon`), 열림은 위(`LineChevronUpSmallIcon`), 16px, `icon-primary`.
- 눌림(`:active`): 항목 전체에 `overlay-hover`(10%)를 배경 층으로 깐다. 글자는 어두워지지 않는다.
- 크기: 폭은 부모를 채운다(Figma 375px). 안쪽 여백 16px, 제목 줄과 설명 사이 4px, 제목과 쉐브론 사이 최소 35px.
- 긴 제목: 한 줄로 두고 말줄임, 개수는 줄어들지 않는다(제안).
- 열림을 눌러도 Figma에 열림의 눌림 모양이 없지만 닫힘과 같은 눌림을 준다(제안).

## 접근성

- Semantic element: 헤더는 `<h2>~<h6>` 안의 `<button>`. 제목 수준은 화면 구조에 맞게 `headingLevel`로 정한다(기본 3).
- 버튼에 `aria-expanded`(열림 여부)와 `aria-controls`(내용이 있을 때 패널 id)를 준다. 이름은 제목+개수, 설명은 `aria-describedby`로 따로 읽힌다.
- 내용이 없는 헤더만 쓰는 경우에도 `aria-expanded`는 토글된다. 펼칠 대상이 다른 곳에 있는 사용법을 위한 것이고, 같은 곳에 내용이 없다면 호출하는 쪽이 `onOpenChange`로 처리한다.
- 내용 영역은 `role="region"` + `aria-labelledby`(헤더 버튼)이고 닫혀 있으면 `hidden`이다. 한 화면에 항목이 많으면 region이 landmark 목록을 늘리므로 6개를 넘으면 재검토한다.
- 제목 수준은 `headingLevel`로 맞춘다. 기본 3은 페이지에 h2가 없으면 수준을 건너뛰므로 사용 지점에서 확인한다. `aria-expanded`와 `hidden`은 항상 같이 바뀐다.
- Keyboard·focus: Tab으로 헤더에 들어가고 Enter·Space로 토글한다(native `<button>`). 포커스 윤곽선은 항목 안쪽 2px `border-brand`다.
- 터치 영역: 항목 전체(높이 56~81px)가 눌린다. `touch-manipulation`을 적용했다.
- 움직임: 눌림 오버레이만 75ms Ease Out(동작 줄이기에서는 전환을 끈다).
- 색만으로 전달하지 않는다: 열림은 쉐브론 방향과 `aria-expanded`로 전달한다.

## Styling과 의존성

| Figma             | 값                          | 사용한 토큰·utility                                      |
| ----------------- | --------------------------- | -------------------------------------------------------- |
| 안쪽 여백·줄 간격 | 16px, 4px                   | `p-s8 gap-s2`                                            |
| 배경              | `#F5F5F5` / 흰색            | `bg-surface-secondary` / `bg-surface-primary`            |
| 제목(설명 있음)   | 18/27 SemiBold, -0.5        | `typography-heading-2-semibold text-text-primary`        |
| 제목(설명 없음)   | 16/24 Medium, -0.25         | `typography-body-1-medium text-text-primary`             |
| 개수              | 제목과 같은 글자, `#454EDF` | `text-text-brand`                                        |
| 설명              | 13/18 Regular, `#535A61`    | `typography-body-4-regular text-text-tertiary`           |
| 눌림              | 검정 10%                    | `bg-overlay-hover`(배경 층)                              |
| 쉐브론            | 16px, `#121212`             | `Line{Up,Down}ChevronSmall` 아이콘 + `text-icon-primary` |

- 타이포 이름: Figma `Body-4-Regular`(13/18)와 이름·값이 같은 `body-4-regular`를 쓴다(2026-10-31 토큰 이름을 Figma와 맞춤).
- dependency 추가 없음. 아이콘은 기존 `LineChevron*SmallIcon`을 쓴다.
- Storybook state matrix: `Default`, `WithoutDescription`, `Open`, `OpenWithoutDescription`, 긴 제목 `LongTitle`, 펼치고 접는 `Interactive`, 여러 항목 `List`(닫힘·열림 4종). Figma 눌림 2종은 아래 이유로 story가 없다. 눌림은 `:active`라 정지 화면으로 만들 수 없어 story로 두지 않았다.

## 확인할 항목

- 펼친 내용 (미정): Figma에 펼친 영역이 없다. `children`은 그대로 그리고 모양은 호출하는 쪽에서 정한다. 사진 그리드 등 실제 내용이 정해지면 여백·구분선을 확인한다.
- 제목 색 (확인): Figma는 닫힌 변형의 제목을 변수 없이 `#111318`로, 열린 변형을 `text-primary`(`#121212`)로 칠했다. 한 단계 차이라 모두 `text-primary` 토큰을 썼다.
- 설명 들여쓰기 (확정): Figma 설명 텍스트가 탭 문자로 시작해 렌더에서 제목보다 약 3.3px 오른쪽에서 시작한다(측정). 디자이너 확인 결과 의도한 들여쓰기가 아니라 텍스트 입력 흔적이라 넣지 않는다.
- 1px 안팎의 차이: 설명 줄이 Figma보다 약 1px 위, 쉐브론이 0.5px 아래(설명 있는 변형), "9장"이 1px 왼쪽이다. 원인을 찾지 못했고 레이아웃 크기(81px·56px)는 정확히 같다.
- 열림의 눌림·hover (제안): Figma에 열림의 눌림과 hover가 없다. 눌림은 닫힘과 같게 줬고 hover는 만들지 않았다.
- `count`가 설명 없는 변형에서도 보이는지 (제안): Figma는 설명이 있는 변형에만 개수를 둔다. 구현은 `count`를 주면 어느 변형에서든 그린다.
- 제목 수준 (제안): `headingLevel`(기본 3)은 Figma에 없는 추가 API다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/web/accordion`(15개 통과), `gen:index:check`, Prettier 통과.

Storybook을 빌드해 Chrome에서 Figma 4배 내보내기와 변형 6종을 비교했다(Pretendard 설치 환경, 눌림은 마우스를 누른 채). 높이 81px·56px이 모두 같고, 눌림 배경(`#DDDDDD` 계열·`#E5E5E5`)과 흰 배경이 같으며, 제목 글자 위치는 0.3px 안에서 같다. 위 "1px 안팎의 차이"와, 의도가 아니라고 확인된 설명 들여쓰기(3.3px)가 남는다. 기본 회색 배경은 토큰 `surface-secondary`가 렌더에서 `#F7F7F8`로 Figma `#F5F5F5`와 2단계 다른데, 토큰을 `#F5F5F5`로 고친 커밋(#103)이 합쳐지면 사라진다. 스크린 리더, 키보드 포커스 링 모양, 강제 색상 모드는 확인하지 않았다.
