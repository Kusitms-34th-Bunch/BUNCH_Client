# 컴포넌트: InviteMemberCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(단위 테스트·Storybook 확인. 시각 대조와 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `추가, 수정된 컴포넌트`(node `6163:187431`) 안 `InviteMemberCard`(node `6163:189178`). 화면 맥락은 `Bunch/Create/Success`(node `6079:176817`)를 따른다.
- 이슈: #290. 이전 구현(라디오 선택 카드, node `640:3926`)을 Figma 수정에 맞춰 눌러서 이동하는 카드로 바꿨다.

## 목적과 범위

### 제공하는 동작

- 멤버 초대 화면으로 이동시키는 카드. 제목, 설명, 오른쪽 화살표를 보여 주고 누르면 `onClick`을 호출한다.

### 제공하지 않는 동작

- 이동 자체(route). 호출하는 쪽이 `onClick`에서 처리한다.
- 선택 상태, 아이콘. 새 Figma에는 왼쪽 아이콘과 라디오 의미가 없다.

## Public API

- Props: `title`, `description`, 그리고 native `<button>` 속성(`onClick`, `className`, `ref` 등). `type`은 항상 `button`이고 `disabled`·`children`은 받지 않는다.
- 이전 API(`name`·`value`·`checked`·`icon` 등 라디오 속성)는 제거했다. 앱에서 쓰는 곳은 `BunchCreated` 하나였고 같이 옮겼다.
- 호출자 소유 책임: 문구, 이동 처리.

## 상태와 동작

- 기본: 연한 회색 카드. 눌려 있는 동안(`:active`): 카드 배경이 10% 어두워진다.
- 긴 텍스트: 제목·설명이 줄바꿈되고 화살표를 밀어내지 않으며 카드 높이가 늘어난다.
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: native `<button type="button">`. form 안에서 눌러도 제출하지 않는다.
- Accessible name: 제목과 설명이 이어져 이름이 된다. 화살표 아이콘은 이름이 없는 장식이다.
- Keyboard·focus: Tab으로 이동하고 Enter·Space로 누른다. 포커스 윤곽선 2px `border-brand`.

## Styling과 의존성

| Figma             | 값                                            | 사용한 토큰·utility                               |
| ----------------- | --------------------------------------------- | ------------------------------------------------- |
| 카드 padding·간격 | 20, 글과 화살표 사이 16                       | `p-s10 gap-s8`                                    |
| 카드 radius       | 14                                            | `rounded-r7`                                      |
| 제목              | Body-1-SemiBold(16/24, -0.25), `text-primary` | `typography-body-1-semi-bold text-text-primary`   |
| 설명              | Body-4-Regular(13/18), `text-tertiary`        | `typography-body-4-regular text-text-tertiary`    |
| 제목·설명 간격    | 4                                             | `gap-s2`                                          |
| 화살표            | Line/Icon-M chevron-right 20, `#bcbec2`       | `LineChevronRightMediumIcon text-icon-quaternary` |

- dependency 추가 없음.

## 확인할 항목

- 눌림 표시 (제안): Figma에 눌림 상태가 없어 이전에 쓰던 진입 카드와 같은 `overlay-hover`(검정 10%)를 배경 layer로 겹쳤다. 디자이너 확인.
- 이동 의미 (미정): Figma 코드는 링크(`a`)다. 지금은 버튼이고 `onClick`에서 이동한다. 링크가 필요하면 렌더 방식을 props로 받게 바꾼다.
- 호버·비활성 (미정): Figma에 없어 구현하지 않았다.

## 검증

- [x] 사용자 관찰 동작 test(이름·설명, 클릭·Enter·Space, form 제출 방지, 화살표 장식, className·ref)
- [x] 지원 상태 story(Default, Pressable, LongText, Narrow)
- [x] public export 영향 확인
- [ ] 브라우저 렌더 대조와 실기기 검증은 하지 못함
