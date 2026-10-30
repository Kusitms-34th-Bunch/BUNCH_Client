# 컴포넌트: EditingAnimation

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 사진 편집·팀원 공동 편집 구간 표시라 BUNCH 사용자 앱에서만 쓴다.
- Status: 구현됨(Storybook 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `EditingAnimation`(node `1379:21257`).
- 이슈: #76

## 목적과 범위

### 제공하는 동작

- 점 3개가 차례로 커졌다 작아지는 30×25 표시. 지금 누군가 편집 중임을 알린다.
- 점마다 투명도 0.3 → 1, 지름 3.17 → 4.23px(Figma 배율 1.22 → 1.627, CSS는 3px 박스 기준으로 환산)가 1.6초 주기로 바뀌고, 점 사이 시차는 0.333초·0.3초다(왼쪽 → 가운데 → 오른쪽, 첫 점 기준 0.333초·0.633초 뒤에 정점).

### 제공하지 않는 동작

- 편집 중인지 판단하거나 누가 편집하는지 보여 주는 일. 켜고 끄는 시점과 주변 문구는 호출하는 쪽이 정한다.
- 크기·색 변형. Figma에 변형이 없다.
- `TextField`의 `editing` 점은 입력창 내부 전용이라 이 컴포넌트와 별개다. 서로 재사용하지 않는다.

## Public API

- Props: `label`, 그리고 native `<span>`의 속성(`className` 등. 접근성 계약을 깨는 `role`·`tabIndex`·`aria-label`·`aria-hidden`·`aria-labelledby`와 `children`은 제외). `label`이 있으면 `role`·`aria-label`을, 없으면 `aria-hidden`을 `...props` 뒤에 적용해 덮어쓸 수 없다. 나머지는 타입으로만 막는다.
- 호출자 소유 책임: `label` 문구(i18n), 배치, 표시 시점, 상태가 바뀔 때의 공지(필요하면 호출하는 쪽이 live region으로 처리. `role="img"`는 나타나거나 사라질 때 읽히지 않는다).

## 상태와 동작

- 항상 재생되는 무한 반복이다. 일시정지·재생 제어는 없다. 진행·활동 표시라 WCAG 2.2.2의 필수(essential) 예외로 보고, 깜빡임 기준(초당 3회 이하)에 걸리지 않는 작은 opacity·scale 변화로만 구성하며 동작 줄이기에서 정지한다.
- 동작 줄이기(`prefers-reduced-motion: reduce`): 움직이지 않고 Figma 첫 프레임의 모양(점마다 투명도 0.3·0.54·0.93, 지름 3.17·3.54·4.12px)으로 정지한다.
- 강제 색상 모드: 점이 사라지지 않도록 `CanvasText`로 칠한다.
- 긴 텍스트·overflow: 글자가 없다. 30×25로 고정이다.

## 접근성

- Semantic element: `<span>`.
- Accessible name·label: `label`을 주면 `role="img"` + `aria-label`, 없으면 `aria-hidden`(옆에 "편집 중" 같은 글자가 있는 경우). 움직임만으로 상태를 전달하지 않도록 사용처에서 이름을 함께 준다.
- 시각 전달: 점 색 `#BCBEC2`는 흰 배경에서 대비가 약 1.8:1로 추정돼(WCAG 1.4.11의 3:1 미달) 점 단독으로는 의미 전달이 부족하다. 눈으로 보는 사용자를 위해 호출하는 쪽이 옆에 "편집 중" 같은 글자를 함께 둔다. 색 자체는 Figma 값이라 코드에서 바꾸지 않았고 디자이너 확인 항목으로 남긴다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.
- 동작 줄이기를 존중한다(위 "상태와 동작").

## Styling과 의존성

| Figma            | 값                                        | 사용한 것                                                     |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------- |
| 크기             | 30×25                                     | `editingAnimation.module.css`의 `.root`                       |
| 점 지름          | 3.17~4.23px(Figma 지름)                   | `.dot` 정수 3px 박스 × `scale(1.057~1.41)`(토큰 없음)         |
| 점 중심 x        | 4.38 · 15.0 · 25.8, 세로 중앙 12.5        | `.dot:nth-child(n)`의 `--x`(`translateX`)                     |
| 점 색            | `#BCBEC2`                                 | `--semantic-icon-quaternary`(같은 값)                         |
| 투명도·크기 변화 | 0.3↔1, 지름 3.17↔4.23px, 1.6초, sine 곡선 | `@keyframes editingAnimationDot`, `cubic-bezier(.37,0,.63,1)` |
| 점 사이 시차     | 0.33초(왼쪽 → 오른쪽)                     | `animation-delay` 0 · −1.267s · −0.967s                       |

- `transform`과 `opacity`만 애니메이션한다(`docs/architecture/motion.md`).
- dependency 추가 없음. Figma의 `motion` 코드 대신 CSS keyframes를 쓴다.
- Storybook state matrix: `Default`(`label` 있음), `WithText`(`label` 없이 옆에 글자). 동작 줄이기는 OS 설정으로 확인하며 story로 분리하지 않았다.

## 확인할 항목

- 켜는 조건 (미정): Figma가 모션만 정의하고 어디서 어떻게 켜는지는 정의하지 않는다. 사진 편집·공동 편집 구간에서 쓰는 것으로 정했고, 실제 문구와 배치는 화면 구현 때 정한다.
- 점 지름 (제안): Figma는 시작 배율이 점마다 달라(1.22·1.36·1.586) 기준 지름을 직접 주지 않는다. 세 점 모두 같은 기준 지름(약 2.6px)에서 시작한다고 보고 3.17~4.23px로 옮겼다.
- 렌더 보정: 박스를 2.6px로 두고 `scale(1.22)`를 주면 소수 크기 박스가 합성 레이어에서 3px로 올림돼 점이 약 15% 크게 그려진다. 그래서 정수 3px 박스에 배율을 환산(×0.8667)해 쓰고, `left`도 정수로 스냅돼 위치가 어긋나므로 `translateX`로 위치를 준다.
- 점 색 대비 (미정): `#BCBEC2`가 흰 배경에서 낮은 대비이고 동작 줄이기 정지 상태의 첫 점은 투명도 0.3이라 더 옅다. 사용처 배경과 함께 디자이너 확인이 필요하다.
- Figma 모션의 총 길이 5초는 1.6초 주기 3회 반복을 담은 것으로 보고 1.6초 주기로 옮겼다. 첫 프레임의 위상(점마다 다름)은 재현하지 않고 steady-state 위상으로 시작한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

CSS keyframes·동작 줄이기·강제 색상 모드의 실제 모양은 jsdom 테스트로 검증되지 않는다(미검증).

실행한 검증: `typecheck`, `lint`, `vitest run src/components/web/editingAnimation`(5개 통과), `gen:index:check`, Prettier 통과.

Chrome에서 동작 줄이기 정지 프레임을 Figma 4배 내보내기(배경 `#3A3A3A`)와 같은 조건으로 렌더해 비교했다. 점 색(중심 픽셀)이 같고, 지름 3.16·3.57·4.14px(Figma 3.20·3.57·4.15), 중심 x 4.38·15.00·25.81(Figma 4.38·15.01·25.81)이며 픽셀 차이는 채널 최대 14, 평균 0.04다. 애니메이션을 0·400·800ms에 멈춰 첫 점의 지름을 재면 3.19·3.71·4.24px(기대 3.17·3.70·4.23)이고 중심은 4.38로 고정이다. Chrome 외 브라우저와 스크린 리더 확인은 하지 않았다.
