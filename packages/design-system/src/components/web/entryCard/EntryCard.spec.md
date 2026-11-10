# 컴포넌트: EntryCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(단위 테스트·Storybook 확인. 시각 대조와 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `추가, 수정된 컴포넌트`(node `6163:187431`) 안 `Entry Card`(Default `6167:13857`, Pressed `6163:184472`)와 `Entry Card/Graphic`(Create `6176:13824`, Join `6176:13836`). 화면 맥락은 `Bunch/Create/Entry`(node `6144:182796`)를 따른다.
- 이슈: #290. 기존 `CreateBunchCard`(흰 원 아이콘 카드)를 대체하며 삭제했다.

## 목적과 범위

### 제공하는 동작

- 번치 시작 방식을 고르는 사진 배경 카드. 누르면 바로 다음 흐름으로 이동하는 버튼이다. 사진, 아래쪽 어두운 그라데이션, 그래픽 아이콘, 제목·설명, 오른쪽 화살표를 보여 준다.

### 제공하지 않는 동작

- 이동 자체(route, 화면 전환). 호출하는 쪽이 `onClick`에서 처리한다.
- 선택 상태, 비활성 상태. Figma에 없다.

## Public API

- Props: `title`, `description`, `imageSrc`(배경 사진 주소), `graphic`(필수), 그리고 native `<button>` 속성(`onClick`, `className`, `ref` 등). `type`은 항상 `button`이다.
- 호출자 소유 책임: 문구, 사진 파일과 주소, 이동 처리, 그래픽 선택(`GraphicEntryCreateIcon`·`GraphicEntryJoinIcon`).

## 상태와 동작

- 기본: 사진 위에 `overlay-dim-subtle`(검정 10%), 아래쪽에 그라데이션. 눌려 있는 동안(`:active`): 어둡게 하는 층이 `overlay-scrim`(검정 60%)으로 바뀐다. 글자와 아이콘은 그 위에 있어 그대로다.
- 높이는 최소 210px이고 긴 문구는 줄바꿈되며 카드가 늘어난다.
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: native `<button type="button">`. form 안에서 눌러도 제출하지 않는다.
- Accessible name: 제목과 설명이 이어져 이름이 된다. 사진·그래픽·화살표는 장식이라 접근성에서 숨긴다.
- Keyboard·focus: Tab으로 이동하고 Enter·Space로 누른다. 포커스 윤곽선 2px `border-brand`.
- 글자 대비: 흰 글자가 사진 위에 놓여 사진마다 대비가 달라질 수 있다. 아래쪽 그라데이션이 글자 뒤를 어둡게 해 주며, 새 사진을 쓸 때 확인한다.

## Styling과 의존성

| Figma            | 값                                            | 사용한 토큰·utility                                   |
| ---------------- | --------------------------------------------- | ----------------------------------------------------- |
| 카드             | 높이 210, padding 20, radius 16, 요소 간격 12 | `min-h-52.5 p-s10 rounded-r8 gap-s6`                  |
| 사진             | 카드를 덮음, 아래 기준 정렬                   | `object-cover object-bottom`                          |
| 기본·눌림 어둡게 | `overlay-dim-subtle` / `overlay-scrim`        | `bg-overlay-dim-subtle group-active:bg-overlay-scrim` |
| 그라데이션       | 높이 118, 아래 검정 60%→0%                    | `h-29.5`, 임의 값 `linear-gradient`(토큰 없음)        |
| 제목             | Heading-2-Semibold(18/27), `text-inversed`    | `typography-heading-2-semibold text-text-inversed`    |
| 설명             | Body-4-Regular(13/18), `text-quinary`         | `typography-body-4-regular text-text-quinary`         |
| 제목·설명 간격   | 2                                             | `gap-s1`                                              |
| 화살표           | Line/Icon-M chevron-right 20, 흰색            | `LineChevronRightMediumIcon text-icon-inversed`       |

- dependency 추가 없음.

## 확인할 항목

- 그라데이션 (제안): Figma 값(검정 60%·40%·8%·0%, 위치 16.5·54.1·90.3·98.7%)을 토큰 없이 그대로 옮겼다. 같은 그라데이션이 다른 곳에서 쓰이면 토큰·utility로 올린다.
- 눌림 색 (제안): Figma Pressed의 어둡게 하는 층 `overlay-scrim`을 그대로 썼다. 눌림 글자색은 Figma 코드가 기본값(검정)이라 읽을 수 없어 흰색을 유지했다.
- 그래픽 아이콘 크기 (제안): Figma 프레임이 47.99×47.31이라 그래픽 규약(정사각형)에 맞춰 48×48로 조립했다(`icons.spec.md`).
- 사진 (제안): Join 사진은 Figma가 120%로 확대·잘라 둔 모습을 같은 영역으로 미리 잘라 `object-cover`로 맞췄다. 용량을 줄이려고 JPEG 82~85로 압축했다. 디자이너가 원본을 주면 교체한다.
- 이동 의미 (미정): 탭하면 화면을 이동하므로 링크가 맞을 수 있다. 지금은 버튼이고 `onClick`에서 이동한다.
- 호버·비활성 (미정): Figma에 없어 구현하지 않았다.

## 검증

- [x] 사용자 관찰 동작 test(이름·설명, 클릭·Enter·Space, form 제출 방지, 사진·그래픽 숨김, className·ref)
- [x] 지원 상태 story(Create, Join, Pressable, LongText, Narrow)
- [x] public export 영향 확인(`yarn gen:index`)
- [ ] 브라우저 렌더 대조와 실기기 검증은 하지 못함
