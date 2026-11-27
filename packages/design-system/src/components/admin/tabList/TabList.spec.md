# 컴포넌트: TabList

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #590, 브라우저 시각 비교 전)
- 디자인 출처: Figma에 묶음 컴포넌트는 없다. `Tab`(node `7601:160592`)을 묶어 탭 역할과 키보드 이동을 주는 틀이다(2026-11-27 사용자 결정).

## 목적과 범위

### 제공하는 동작

- 여러 `Tab`을 이름 있는 `tablist`로 묶는다.
- 방향키(←→)·Home·End로 탭 사이 초점을 옮기고, Enter·Space로 선택한다.

### 제공하지 않는 동작

- 탭 패널(`role="tabpanel"`) 연결은 없다. 어드민 탭은 목록의 검색 조건을 바꾸는 용도다.
- 탭 사이 간격·바깥 여백은 정하지 않는다. 호출하는 쪽이 `className`으로 정한다.

## Public API

- Props:
  - `value: string`, `onValueChange: (value: string) => void`: 선택된 탭(제어 컴포넌트). URL 검색 조건과 연결하는 것을 전제로 한다.
  - `aria-label` 또는 `aria-labelledby`: 필수(이름 없는 tablist 방지).
  - `activateOnFocus?: boolean`: 방향키로 초점을 옮길 때 바로 선택할지. 기본 `false`.
  - `className?: string`, `children`(`Tab` 목록).
- Controlled / uncontrolled: controlled만 지원한다.
- 호출자 소유 책임: 선택 값 보관과 전환, 묶음 이름 문구.

## 상태와 동작

- 선택된 탭만 Tab 키 순서에 들어간다(roving tabindex).
- 비활성 탭은 방향키 이동에서 건너뛴다.

## 접근성

- Semantic element: Base UI `Tabs.Root` + `Tabs.List`(`role="tablist"`).
- Accessible name·label: `aria-label` 또는 `aria-labelledby` 필수.
- Keyboard·focus: ←→·Home·End로 초점 이동, Enter·Space로 선택.

## Styling과 의존성

- 배치: `flex items-end`.
- 허용되는 dependency: `@base-ui/react`(Tabs). Base UI 타입은 공개하지 않는다(`MenuTabs`와 같은 원칙).
- Storybook state matrix: `Default`(전체·접수·조치·비활성 탭).

## 모션

- 선택 선 이동(2026-11-27 사용자 결정, 어드민 Figma에 모션이 없어 web `MenuTabs` 값을 따름): 선택한 탭으로 선이 미끄러진다. Base UI `Tabs.Indicator`의 `--active-tab-left`·`--active-tab-width`를 250ms ease-out으로 전환(`left`·`width`, motion.md의 메뉴 탭 밑줄 예외와 같음).
- 동작 줄이기: 전환 없이 바로 옮긴다. 강제 색상 모드는 시스템 글자색으로 그린다.

## 확인할 항목

- 선택 방식 (제안): 방향키는 초점만 옮기고 Enter·Space로 선택한다. 선택이 목록을 다시 불러오므로 초점 이동마다 불러오지 않게 했다.

## 검증

- [x] 사용자 관찰 동작 test(이름, 클릭 선택, 방향키 초점 이동, roving tabindex)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(`@app/design-system/admin`, `yarn gen:index`)
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Enter·Space 선택과 초점 윤곽 확인
