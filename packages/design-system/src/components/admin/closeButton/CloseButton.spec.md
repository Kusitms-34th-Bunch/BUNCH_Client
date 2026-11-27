# 컴포넌트: CloseButton

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #590, 브라우저 시각 비교 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Close Button`(node `7703:82571`). Figma 이름과 코드 이름이 같다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 어드민 화면(모달·패널)을 닫는 24px 원형 아이콘 버튼.
- 상태: Default, Hover(Figma `Status=Hover`), Pressed(Figma `Status=Pressed`).

### 제공하지 않는 동작

- 비활성 상태는 Figma에 없어 만들지 않는다. `disabled` prop도 타입에서 뺐다.
- 크기 변형은 Figma에 24px 하나뿐이다.
- 닫는 동작 자체는 호출하는 쪽이 `onClick`으로 정한다.

## Public API

- Props: native `<button>`의 속성(`onClick`, `className`, `ref`, `aria-*` 등, `disabled` 제외). `aria-label`은 필수다.
- `type` 기본값은 `button`이다.
- 이벤트: `onClick`.
- Controlled / uncontrolled: 해당 없음.
- 호출자 소유 책임: 접근성 이름 문구(예: "닫기"), 닫는 동작.

## 상태와 동작

- Default: 바탕 `surface-primary`, 아이콘 `LineCloseSmallIcon`(16px) `icon-secondary`.
- Hover: 바탕 위에 `overlay-hover` 덮개.
- Pressed: 바탕 위에 `overlay-pressed` 덮개.
- 긴 텍스트·overflow: 글자가 없어 해당 없음.

## 접근성

- Semantic element: native `<button type="button">`.
- Accessible name·label: `aria-label` 필수. 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab으로 이동하고 Enter·Space로 누른다. 포커스 윤곽은 `IconButton`과 같은 `outline-border-brand` 2px이다.
- 누름 영역: 24px이다. 어드민은 데스크톱 웹 전용이라 터치 영역 확장은 하지 않는다(2026-11-27 합의).

## Styling과 의존성

| Figma 값                                    | 토큰·클래스                                 |
| ------------------------------------------- | ------------------------------------------- |
| 크기 24×24, `radius-full`                   | `size-6 rounded-full`                       |
| 바탕 `surface/surface-primary`              | `bg-surface-primary`                        |
| Hover `overlay/overlay-hover`(검정 10%)     | `hover:before:bg-overlay-hover` 덮개        |
| Pressed `overlay/overlay-pressed`(검정 20%) | `active:before:bg-overlay-pressed` 덮개     |
| 아이콘 `Line/Icon-S/Close` 16px, 선 #25282D | `LineCloseSmallIcon`, `text-icon-secondary` |

- 허용되는 dependency: 아이콘 생성물(`LineCloseSmallIcon`), `cn`.
- Storybook state matrix: `Default`(Hover·Pressed는 마우스로 확인, story로 강제 상태를 만들지 않음).

## 확인할 항목

- 누름 영역 24px (확정): 어드민은 데스크톱 웹 전용이라 터치 영역 확장을 하지 않는다(2026-11-27 사용자).
- 포커스 윤곽 (제안): Figma에 Focus 변형이 없어 `IconButton`과 같은 윤곽을 쓴다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(`@app/design-system/admin`, `yarn gen:index`)
- [x] 실행 command와 결과: `yarn workspace @app/design-system vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
