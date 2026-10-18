# 컴포넌트: LabeledTextField

## 메타데이터

- 소유 경계: design-system `core`(`@app/design-system`)
- Status: 구현됨(`next build` 렌더를 Figma 값과 측정으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Labled_Text_Field`(화면 `Bunch/Create/BasicInfo` node `791:2868`, 오류 상태 `875:5539`).

## 목적과 범위

### 제공하는 동작

- 입력창 위에 보이는 라벨, 입력창(`TextField`), 아래 안내 줄을 세로로 쌓는다.
- `maxLength`와 문자열 `value`를 주면 안내 줄 오른쪽에 글자 수(`5/12`)를 보여 준다.
- `error`를 주면 안내 줄 왼쪽에 빨간 안내 문구를 보여 주고 입력창을 잘못된 값으로 표시한다.

### 제공하지 않는 동작

- 입력값 검증과 오류 문구 결정. 호출하는 쪽이 `error`로 넘긴다.
- 입력 길이 제한 자체는 native `maxLength`가 한다(넘겨서는 입력되지 않는다).
- 지우기·오른쪽 동작 영역은 `TextField`의 `onClear`·`action`을 그대로 쓴다.

## Public API

- Props: `label`(필수), `error`, 그리고 `TextField`의 속성(`value`, `onChange`, `maxLength`, `placeholder`, `id`, `className` 등). `aria-describedby`는 글자 수·오류 연결에 쓰여 받지 않는다.
- `className`은 바깥 래퍼에 붙는다. `id`를 주면 입력창 id로 쓰고 없으면 자동 생성한다.
- 호출자 소유 책임: 라벨·안내 문구, 검증 규칙, 값 상태.

## 상태와 동작

- 기본: 라벨, 안내 문구가 있는 입력창, 글자 수(`maxLength`가 있을 때).
- 입력됨: 글자 수가 입력에 따라 바뀐다.
- 오류: 입력창은 Figma에서 기본과 같은 테두리를 유지하고 안내 문구만 빨간색으로 보인다.
- 글자 수가 없는 경우(`maxLength` 없음 또는 uncontrolled): 안내 줄에 글자 수를 그리지 않는다.
- 로딩·disabled는 `TextField`를 따른다.

## 접근성

- 보이는 `<label htmlFor>`가 입력창에 연결돼 이름이 된다(`TextField`의 `aria-label`과 같은 문구).
- 오류는 입력창의 `aria-invalid`와 `aria-describedby`(보이는 안내 문구)로 연결한다. 오류가 바뀔 때의 읽기는 오류가 생기기 전부터 항상 있는 `role="status"`(sr-only) 영역이 맡고, 보이는 안내 문구는 읽기 중복을 막으려고 `aria-hidden`이다. 색만으로 오류를 전달하지 않고 문구가 있다.
- 글자 수도 `aria-describedby`에 연결돼 입력창에 포커스가 오면 함께 읽힌다.
- Keyboard·focus는 `TextField`를 따른다.

## Styling과 의존성

| Figma               | 값                                                  | 사용한 토큰·utility                                    |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| 라벨                | Body-2-SemiBold(14/21, -0.5), `text-secondary`      | `typography-body-2-meduim text-text-secondary`         |
| 라벨-입력창 간격    | 4                                                   | `gap-s2`                                               |
| 입력창-안내 줄 간격 | 6                                                   | `gap-s3`                                               |
| 글자 수             | Body-3-Regular(13/18), `text-tertiary`, 오른쪽 정렬 | `typography-body-3-regular text-text-tertiary ml-auto` |
| 오류 문구           | Caption-1-Medium(12/16, +0.25), `system-fail-text`  | `typography-caption-1-medium text-system-fail-text`    |

- 오류 문구 색은 토큰 `system-fail-text`(`red-500`, `#f04d29`)다. 토큰 동기화(#52)로 `tokens.css`에 들어와 fallback 없이 쓴다(`TextButton`의 warning 글자색과 같은 토큰).
- dependency 추가 없음. `core`의 `TextField`를 조합한다.
- Storybook state matrix: 빈 입력, 입력됨, 오류, 글자 수 없음, 입력하며 바뀌는 모습(`Interactive`).

## 확인할 항목

- 오류 상태 테두리 (제안): Figma의 오류 화면에서 입력창 테두리는 기본과 같다. 빨간 테두리를 더하지 않았다. 디자이너 확인.
- 글자 수 표기 (확정): `5/12` 형태. Figma 빈 상태 화면의 `0/8`은 `0/12`의 오기로 보고 최대 12자로 구현했다(사용자 확인).
- 오류 색 대비 (제안): `#f04d29` 대 흰색은 약 3.6:1(수식 계산)로 12px 글자의 AA 기준(4.5:1)에 못 미친다. Figma 값 그대로이고 오류가 색만이 아니라 문구로도 전달된다. 더 어두운 계열을 쓸지 디자이너 확인(`TextButton` warning 글자색과 같은 문제이며 `TextButton.spec.md`에도 기록됨).
- 글자 수와 한글 입력 (미검증): 한글 조합 입력 중 `maxLength`가 마지막 글자를 어떻게 자르는지는 실기기 IME에서 확인하지 못했다.

## 검증

- [x] 사용자 관찰 동작 test(라벨 연결, 글자 수, 길이 제한, 오류 연결, 설명 연결, 여러 개, id·className)
- [x] 지원 상태 story
- [x] public export 영향 확인(`yarn gen:index`로 `core/index.ts`에 export 추가)
- [x] `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated` 통과
- [x] `next build` 렌더를 headless Chromium에서 측정해 라벨·입력창·글자 수·오류 문구 위치와 글자 스타일을 Figma와 대조
- [ ] 스크린 리더 낭독, 실기기, 한글 IME 입력은 미검증
