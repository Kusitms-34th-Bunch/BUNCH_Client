# 컴포넌트: LabeledTextArea

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`). `LabeledTextField`와 같은 폴더에 둔다. 안내 줄 `fieldFooter.internal.tsx`는 이 컴포넌트만 쓴다.
- Status: 구현됨(렌더를 Figma 값과 측정으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Labled_Text_Field`가 쓰인 `Bunch/Create/Description`(node `791:2994` 빈 입력, `791:3022` 입력됨). 화면설계서(node `791:8480`)를 함께 참고했다.

## 목적과 범위

### 제공하는 동작

- 입력창 위 라벨, 여러 줄 입력창, 아래 안내 줄(오류·글자 수)을 세로로 쌓는다. 라벨·입력창 모양은 `LabeledTextField`와 맞추고, 안내 줄은 `fieldFooter.internal.tsx`가 그린다.
- 한 줄로 시작해 입력이 길어지면 자동으로 줄바꿈되고 높이가 늘어난다(설계서: "입력 내용이 길어질 경우 자동 줄바꿈"). 값(`value`)을 주는 controlled 사용을 기준으로 하며 uncontrolled에서는 높이가 늘지 않는다. 값이 바뀔 때와 입력창 폭이 바뀔 때(회전, 글자 크기 변경) 높이를 다시 맞춘다.
- `maxLength`와 문자열 `value`를 주면 글자 수(`24/50`)를 보여 주고 최대 길이를 넘겨서는 입력되지 않는다.
- `error`를 주면 안내 문구와 `aria-invalid`로 표시한다.

### 제공하지 않는 동작

- 입력값 검증과 문구 결정, 줄바꿈 입력(Enter) 제한. 호출하는 쪽이 정한다.
- 지우기 버튼·오른쪽 동작 영역. `TextField`의 기능이며 이 컴포넌트에는 없다.

iOS WebKit에서는 입력 텍스트를 16px로 렌더링하고 0.875배 축소해 14px 디자인을 유지한다. 폭·행 높이·padding을 보정하며 textarea 자동 높이에는 축소 비율을 반영한다. 실제 터치·커서·선택·한글 줄바꿈 검증은 별도로 필요하다.

## Public API

- Props: `label`(필수), `error`, 그리고 `<textarea>`의 속성(`value`, `onChange`, `maxLength`, `placeholder`, `id`, `className` 등). `rows`·`aria-label`·`aria-describedby`는 받지 않는다.
- `className`은 바깥 래퍼에 붙는다. `id`가 없으면 자동 생성한다.
- 호출자 소유 책임: 라벨·안내 문구, 검증 규칙, 값 상태.

## 상태와 동작

- 빈 입력: 안내 문구(placeholder)와 `0/50`. 한 줄일 때 높이는 `LabeledTextField`의 입력창과 같은 47px이다.
- 입력됨: 글자 수가 바뀌고, 줄이 늘면 높이가 `scrollHeight`에 맞춰 늘어난다. 입력창은 직접 크기를 바꿀 수 없다(`resize-none`).
- 오류: 안내 줄 왼쪽에 빨간 문구로 보이고 입력창이 `aria-invalid`가 된다. 문구는 `aria-hidden`이고 읽기는 `role="status"` 영역이 맡는다(`LabeledTextField`는 보이는 문구가 `role="alert"`라 방식이 다르다).
- disabled·로딩은 지원하는 범위를 정하지 않았다.

## 접근성

- 강제 색상 모드에서는 테두리 색 변화가 사라질 수 있어 입력 영역에 2px 시스템 색 윤곽선을 추가한다.

- 보이는 `<label htmlFor>`가 이름이다. 오류와 글자 수는 `aria-describedby`로 연결하고, 오류가 바뀔 때 읽기는 항상 있는 `role="status"` 영역이 맡는다(`LabeledTextField`의 `role="alert"` 방식과 다르다).
- 내용이 길어져 높이가 늘어도 포커스와 입력 위치는 유지된다.
- 포커스 시 1px 테두리를 `border-strong` 색상으로 바꾸고 안내 문구를 숨긴다. 포커스 해제 시 기본 테두리·안내 문구로 돌아간다.

## Styling과 의존성

| Figma        | 값                                                            | 사용한 토큰·utility                                                            |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 입력창       | 테두리 `border-secondary`, radius 10, 좌우 16, 위아래 10      | `rounded-r5 border border-border-secondary px-padding-p8 py-padding-p5`        |
| 입력 글자    | Body-2-Regular(14/21), `text-primary`, 안내 `text-quaternary` | `typography-body-2-regular text-text-primary placeholder:text-text-quaternary` |
| 라벨·안내 줄 | 라벨은 `LabeledTextField`와 같고 안내 줄은 `FieldFooter`      | 같은 utility                                                                   |

- dependency 추가 없음. 높이 조절은 `useLayoutEffect`로 `scrollHeight`를 읽는다(`field-sizing`을 쓰지 않아 iOS WebView 지원 여부와 무관하다).

## 확인할 항목

- 포커스 표시 (확정): Figma `720:3803`·`796:4808`과 동일하게 적용한다. `border-strong` semantic 토큰이 아직 없어 같은 값인 `focus-within:border-primitive-gray-700`(#25282d)을 쓴다. semantic 토큰 동기화 후 교체한다.
- 줄바꿈 입력 (미정): 한 줄 소개에서 Enter로 줄을 바꿀 수 있는지 설계서에 없다. 이 컴포넌트는 막지 않고 호출자가 정한다.
- 한글 IME와 높이 (미검증): 조합 중 `scrollHeight`가 어떻게 바뀌는지 실기기에서 확인하지 못했다.
- 글자 수 최대치 (확정): 설계서 본문과 Figma는 50이다(설계서 목업의 `0/30`은 오기로 본다).

## 검증

- [x] 사용자 관찰 동작 test(라벨, 글자 수, 길이 제한, 높이 늘어남, 오류 연결·status, id·className)
- [x] 지원 상태 story
- [x] public export 영향 확인(`yarn gen:index`로 `web/labeledTextField/index.ts` 반영)
- [x] `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated` 통과
- [ ] 렌더 측정, 스크린 리더 낭독, 실기기, 한글 IME는 미검증(화면 구현 뒤 함께 측정)
