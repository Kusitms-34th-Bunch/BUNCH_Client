# 컴포넌트: CommentInput

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Input Field`(node `4137:111029`, `State=Default·Focused·Filled`), 보내기 버튼 `IconButton/ArrowUp`(node `3551:28413`, `State=Default·Disabled·Pressed`)
- 기능 명세: `docs/specs/feed.md` 6.2.8(댓글 입력)
- 이슈: #251

## 목적과 범위

### 제공하는 동작

- 둥근 회색 칸 안의 댓글 입력과 보내기 버튼. 입력이 공백뿐이면 보내기가 비활성이다.
- 줄바꿈을 유지하므로 Enter는 줄바꿈이고, 보내기는 버튼으로만 한다. 입력이 길어지면 4줄까지 칸이 늘고 이후 칸 안에서 스크롤한다.
- `form` 요소라 보내기 버튼은 submit이다. `onSubmit`은 입력값 그대로 받는다.

### 제공하지 않는 동작

- 앞뒤 공백 정리, 보낸 뒤 입력 비우기·키보드 내리기, 연타 방지는 호출자가 한다(`disabled`로 막을 수 있음).
- 안내 문구(「{번치 이름}으로 댓글 달기」의 조사 선택)는 호출자가 만든다.

## Public API

- Props: `value`, `onValueChange`, `onSubmit`, `placeholder`(필수), `label`(기본은 안내 문구), `submitLabel`(기본 「보내기」), `maxLength`, `disabled`, native `<form>` 속성(`className`은 칸에 적용).
- Figma 이름 대응: `State=Default`(빈 칸)·`Focused`(입력 중, 빈 칸)·`Filled`(입력됨)는 입력값과 포커스로 자연히 정해진다.

## 상태와 동작

| 상태             | 모양                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| 빈 칸            | 안내 문구(Body-3-SemiBold, `text-quinary`), 보내기 회색(`#EAEAEA`, 비활성) |
| 입력됨           | 입력 글자(Body-3-Regular, `text-primary`), 보내기 브랜드색(`#454EDF`)      |
| 보내기 누르는 중 | 브랜드색 위 검정 20%                                                       |
| 여러 줄          | 반경 24로 둥근 사각형, 보내기는 아래쪽에 붙음, 4줄(88px) 넘으면 스크롤     |

## 접근성

- 입력칸 이름은 `label`(기본 안내 문구), 보내기 버튼 이름은 「보내기」.
- 보내기 버튼은 그래픽 30px이고 누르는 영역을 40px로 넓혔다(입력칸과 겹치지 않는 범위). 비활성은 native `disabled`.
- 입력 중에는 칸 둘레에 1px 짙은 선(`primitive-gray-700`)을 그린다. `SearchField`와 같은 방식이고, 커서만으로는 키보드 사용자가 위치를 알기 어렵다는 접근성 리뷰를 반영했다(Figma `Focused`에는 선이 없음, 확인할 항목). 보내기 버튼은 키보드 포커스 시 `border-brand` 2px 테두리.

## Styling과 의존성

| Figma     | 값                                                     | 토큰·클래스                                                                                                                                                                               |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 칸        | `surface-secondary`, 왼쪽 12·오른쪽 8·위아래 6, 간격 4 | `bg-surface-secondary pl-padding-p6 pr-padding-p4 py-padding-p3 gap-s2`                                                                                                                   |
| 반경      | full                                                   | `rounded-r10`(24, 한 줄에서는 알약 모양과 같음)                                                                                                                                           |
| 입력 글자 | Body-3-Regular 14/21 `#121212`, 위아래 2               | `typography-body-3-regular text-text-primary py-padding-p1`                                                                                                                               |
| 안내 문구 | Body-3-SemiBold 14/21 `#BCBEC2`                        | 크기·줄 높이는 본문을 따르고 굵기·자간만 `placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1)`, 색 `placeholder:text-text-quinary` |
| 보내기    | 30×30 그래픽 3종                                       | `GraphicCommentSend*Icon`(아이콘 파이프라인 `svg-graphic`)                                                                                                                                |

- 보내기 그래픽 3종을 이번에 아이콘 파이프라인에 추가했다(`icons.spec.md`).
- 새 dependency 없음. 높이 자동 조절과 iOS 확대 방지는 `LabeledTextArea`와 같은 방식(`inputScale.textareaSlot`, `useTextareaAutoHeight`)이다. iOS에서는 16px로 그린 뒤 0.875배로 줄여 14px로 보인다.
- Storybook: `Default`, `Filled`, `MultiLine`.

## 확인할 항목

- 입력 중 테두리 (Figma와 다름): 접근성을 위해 1px 짙은 선을 더했다. 디자이너 확인.
- 200자에서 입력이 말없이 멈춘다. 남은 글자 수 안내를 둘지 기획 확인.
- 여러 줄 입력 모양 (Figma에 없음): 명세가 줄바꿈 유지라 여러 줄을 받게 했다. 최대 4줄과 둥근 사각형 모양은 정한 값이다(디자이너 확인).
- iOS 실기기에서 포커스 시 화면이 확대되지 않는지, 축소된 글자의 줄 높이가 맞는지 확인한다.
- 보내기 비활성 회색(`#EAEAEA`)과 흰 화살표, 회색 칸 배경 대비가 낮다(Figma 값).

## 검증

- 단위 테스트: 안내 문구가 입력칸 이름, 빈 값·공백만이면 보내기 비활성, Enter는 줄바꿈이고 버튼으로 입력값을 보냄, `maxLength` 전달, `disabled`.
- Storybook(Chromium) 측정: 칸 높이 42로 Figma와 같음, 여러 줄은 칸 104(입력 88)에서 멈추고 칸 안에서 스크롤, 보내기가 아래쪽에 붙음. 스크린 리더·실기기는 확인하지 않았다.
