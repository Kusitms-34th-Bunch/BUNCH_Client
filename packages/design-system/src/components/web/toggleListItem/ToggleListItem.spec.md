# 컴포넌트: ToggleListItem

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). MY 설정 화면의 설정 행이다.
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `MY 컴포넌트` 안 `Toggle_List`(node `3462:62296`). 목록 행 이름 규칙에 맞춰 `ToggleListItem`으로 바꿨다.
- 이슈: #205

## 목적과 범위

### 제공하는 동작

- 제목(필수)·설명(선택)과 `Toggle`을 한 줄로 묶은 행. 행 전체가 `<label>`이라 어디를 눌러도 켜고 끈다.
- 상태: Default, Disabled(행 전체 40%, 글자 `text-disabled`).

### 제공하지 않는 동작

- 문구. 제목·설명은 호출하는 쪽이 준다.
- 구분선·목록 묶음. 여러 행을 묶는 제목(`fieldset`·`legend` 등)은 화면이 둔다.

## Public API

- Props: `title`, `description?`, 그 밖에는 `Toggle`과 같다(input에 전달). `className`은 행에 적용한다.
- 제어 방식: `checked` + `onChange` 또는 `defaultChecked`.

## 상태와 동작

- Default: 제목 `typography-body-2-medium text-secondary`, 설명 `typography-caption-1-regular text-tertiary`.
- Disabled: 행 `opacity-(--semantic-opacity-disabled)`(40%), 글자 `text-disabled`, 토글은 비활성 트랙.
- 긴 글자: 글자 영역이 줄바꿈되고 토글은 줄어들지 않는다.

## 접근성

- 토글의 접근성 이름은 제목(`aria-labelledby`), 설명은 `aria-describedby`로 연결한다. 설명이 없으면 연결하지 않는다.
- Keyboard·focus: Tab으로 토글에 들어가고 Space로 켜고 끈다. 포커스 윤곽선은 토글에 그린다.

## Styling과 의존성

| Figma       | 값                       | 사용한 토큰·utility                                           |
| ----------- | ------------------------ | ------------------------------------------------------------- |
| 행 여백     | 좌우 8, 위아래 6         | `px-padding-p4 py-padding-p3`                                 |
| 글자 사이   | 4                        | `gap-s2`                                                      |
| 글자와 토글 | 글자 폭 260 고정(343 행) | `gap-s6`(12) + 글자 `flex-1`                                  |
| 비활성      | 40%, 글자 `#969AA0`      | `opacity-(--semantic-opacity-disabled)`, `text-text-disabled` |

- 의존: core `Toggle`.
- Storybook state matrix: Default·On·Disabled·WithoutDescription·LongText(343px 폭).

## 확인할 항목

- 글자 폭 (제안): Figma는 글자 폭 260을 고정했다. 화면 폭이 달라져도 맞도록 남은 폭을 채우고 토글과 12px을 띄웠다. 343px 행에서 글자 폭은 263px로 3px 차이다.
- 비활성 흐림 (확인 필요, 디자이너): Figma 값대로 행 40%에 글자 `#969AA0`, 비활성 토글(`#EAEAEA`)이 겹쳐 흰 배경에서 글자와 트랙이 매우 흐리다. 의도한 정도인지 확인한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] Storybook 렌더와 Figma 대조(Default·On·Disabled)
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`, `vitest run src/components/core/checkbox src/components/core/toggle src/components/web/toggleListItem src/icons`(32개 통과). Storybook 렌더를 Chrome에서 Figma 스크린샷과 눈으로 대조했다. 스크린 리더, 고대비 테마, 실기기는 확인하지 않았다.
