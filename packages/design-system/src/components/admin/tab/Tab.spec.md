# 컴포넌트: Tab

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #590, 브라우저 시각 비교 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Tab`(node `7601:160592`). Figma 이름과 코드 이름이 같다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 목록 화면 위쪽의 탭 하나(라벨 + 건수). 예: 신고 조회의 "접수 12", "조치 3".
- 상태: Default, Hover, Selected(아래 2px 선), Disabled(흐림 40%).

### 제공하지 않는 동작

- 탭 묶음은 `TabList`가 맡는다. `Tab`은 `TabList` 안에서만 쓴다(`TabList.spec.md`).
- 탭 패널(`role="tabpanel"`)은 만들지 않는다. 어드민 탭은 목록의 검색 조건을 바꾸는 용도다.

## Public API

- Props:
  - `children`: 라벨.
  - `count?: number`: 라벨 옆 건수. 없으면 숨긴다.
  - `value: string`: 탭 값. `TabList`의 `value`와 같으면 선택된다.
  - `disabled?: boolean`, `className?: string`.
- 이벤트: 선택은 `TabList`의 `onValueChange`로 알린다.
- Controlled / uncontrolled: controlled(`TabList`).
- 호출자 소유 책임: 라벨 문구, 건수 값.

## 상태와 동작

- Default: 라벨 `heading-2-medium` `text-secondary`, 건수 `body-3-regular` `text-tertiary`.
- Hover(선택 안 된 탭): `overlay-hover` 덮개를 글자 위까지 얹어 글자도 함께 어두워진다.
- Selected: 아래쪽 2px `border-brand` 선. 선은 탭마다 그리지 않고 `TabList`의 Indicator 하나가 선택된 탭 아래로 옮겨 다닌다(높이 31px 안쪽, 모션은 `TabList.spec.md`).
- Disabled: 전체 흐림 40%, 누를 수 없다.
- 긴 텍스트·overflow: 줄바꿈하지 않는다(`whitespace-nowrap`). 탭 폭은 내용을 따른다.

## 접근성

- Semantic element: Base UI `Tabs.Tab`(`<button role="tab">`).
- 선택 상태: `aria-selected`로 전달한다. 색·선만으로 전달하지 않는다.
- Accessible name·label: 라벨과 건수가 함께 읽힌다(예: "접수 12").
- Keyboard·focus: 선택된 탭만 Tab 키 순서에 들어가고, 방향키로 탭 사이를 옮긴다(`TabList`). 포커스 윤곽은 `outline-border-brand` 2px 안쪽이다.

## Styling과 의존성

| Figma 값                                                  | 토큰·클래스                                           |
| --------------------------------------------------------- | ----------------------------------------------------- |
| 패딩 좌우 `padding-p8`(16), 위아래 `padding-p1`(2)        | `px-padding-p8 py-padding-p1`                         |
| 간격 `spacing-s2`(4), 아래 정렬                           | `gap-s2 items-end`                                    |
| 라벨 `Heading-2-Medium` 18/27, `text-secondary`           | `typography-heading-2-medium text-text-secondary`     |
| 건수 `Body-3-Regular` 14/21, `text-tertiary`              | `typography-body-3-regular text-text-tertiary`        |
| Selected 아래 선 `border-width-strong`(2), `border-brand` | `TabList`의 `Tabs.Indicator` `h-0.5 bg-border-brand`  |
| Hover `overlay-hover`(글자 위 덮개)                       | `before:bg-overlay-hover hover:before:opacity-100`    |
| Disabled `opacity-disabled`(40)                           | `data-disabled:opacity-(--semantic-opacity-disabled)` |

- 허용되는 dependency: `@base-ui/react`(Tabs).
- Storybook state matrix: `Matrix`(Disabled·Default·Selected), `WithoutCount`, `LongLabel`. 묶음 동작은 `Admin/Navigation/TabList`.

## 확인할 항목

- Hover 글자색 (확정): Figma Hover도 `text-secondary`·`text-tertiary` 토큰이다. 덮개가 글자 위까지 덮는 모양이라 덮개를 내용 위에 얹는다(2026-11-27 Figma 변수 확인).
- 화살표 키 이동 (확정): `TabList`까지 함께 구현한다(2026-11-27 사용자).
- 탭 패널 (제안): 화면 안 패널을 바꾸는 탭이 필요해지면 `TabList`에 패널 연결을 추가한다. 패널 없는 필터 탭 예외는 `design-system-components.md`의 tabs 항목에 적었다.
- 건수의 뜻 (제안): "접수 12"의 12가 무엇인지 화면 낭독만으로는 알기 어렵다. 실제 화면에서 뜻이 정해지면 보조 문구를 받는 prop을 검토한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(`@app/design-system/admin`, `yarn gen:index`)
- [x] 실행 command와 결과: `yarn workspace @app/design-system vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
