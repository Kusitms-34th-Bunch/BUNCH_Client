# 컴포넌트: MetricCard

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #592)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Metric Card`(node `7771:167351`). 화면설계서에서는 번치 스팟 상세의 성과 격자 칸이다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 지표 하나: 이름, 값, 단위(선택), 보조 설명(선택).

### 제공하지 않는 동작

- 숫자 표기(천 단위 쉼표, 비율 계산)는 하지 않는다. 호출자가 문자열로 넘긴다.
- 격자 배치는 호출자가 정한다. 카드는 부모 폭을 채운다.

## Public API

- Props: `label`, `value`(string | number), `unit`, `description`, native `<dl>` 속성.
- 호출자 소유 책임: 지표 문구, 값 표기, 격자 배치.

## 상태와 동작

- 이름 `body-3-semibold` `text-tertiary`, 값 `title-1-semi-bold` `text-secondary`, 단위 `body-2-regular` `text-tertiary`, 보조 설명 `caption-1-regular` `text-tertiary`.
- 상태 변형은 없다(Figma 하나).

## 접근성

- Semantic element: `<dl>`(이름 `dt`, 값·설명 `dd`). 스크린 리더가 이름과 값을 짝으로 읽는다.
- 값과 단위 사이에 공백 문자를 두었다. flex 안의 공백이라 스크린 리더가 「12,480 회」로 띄어 읽는지는 확인하지 못했다(붙여 읽어도 뜻은 같음).

## Styling과 의존성

| Figma 값                                                          | 토큰·클래스                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 바탕 `surface-primary`, 테두리 `border-secondary`, `radius-r3`    | `bg-surface-primary border border-border-secondary rounded-r3` |
| 위 `padding-p5`(10), 아래 `padding-p7`(14), 좌우 `padding-p6`(12) | `pt-padding-p5 pb-padding-p7 px-padding-p6`                    |
| 이름·값 묶음 간격 `spacing-s2`(4), 값·설명 간격 `spacing-s1`(2)   | `gap-s2`, `gap-s1`                                             |

- 허용되는 dependency: `cn`.
- Storybook state matrix: `Default`, `WithoutDescription`, `Grid`(성과 격자 2열 예시).

## 확인할 항목

- 폭 (제안): Figma 컴포넌트는 글자 묶음 94px 고정이지만 화면에서는 격자 칸을 채운다. 부모 폭을 채우게 했다.

## 검증

- [x] 사용자 관찰 동작 test(dt·dd 짝, 선택 항목 숨김)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
