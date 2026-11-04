# 컴포넌트: Toggle

## 메타데이터

- 소유 경계: design-system `core`(`@app/design-system`으로 import). 켬·끔 컨트롤이라 모든 앱이 쓸 수 있다.
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `MY 컴포넌트` 안 `Toggle`(node `3462:61621`)
- 이슈: #205

## 목적과 범위

### 제공하는 동작

- 52×28 켬·끔 토글. native `<input type="checkbox" role="switch">`를 쓰고 트랙과 노브를 덮어 그린다.
- 상태: Figma `Status`의 `Default`·`Disabled` × 값 `False`(꺼짐)·`True`(켜짐) 네 가지.

### 제공하지 않는 동작

- 글자(라벨). 이름은 `aria-label`이나 감싸는 `<label>`로 준다. 제목·설명이 붙은 행은 `ToggleListItem`(web).
- 누르는 동안·hover 모양. Figma에 없다.

## Public API

- Props: native `<input type="checkbox">`의 속성(`type`·`role`·`children` 제외). `className`·`style`은 바깥 래퍼에 적용한다.
- 제어 방식: `checked` + `onChange` 또는 `defaultChecked` 모두 쓸 수 있다.
- 호출자 소유 책임: 접근성 이름, 켜짐 값 저장.

## 상태와 동작

- 기본: 트랙 `surface-inversed-lighter`, 흰 노브 20px이 꺼짐은 왼쪽, 켜짐은 오른쪽.
- 비활성: 트랙 `surface-disabled`. 켜진 채 비활성이면 `overlay-hover`(10%)를 겹친다.
- 노브 이동: 150ms ease-out(Radio 선택 전환과 같은 값). 동작 줄이기에서는 바로 바뀐다.
- 키보드 포커스(`:focus-visible`): 2px `border-brand` 윤곽선.

## 접근성

- Semantic element: `role="switch"`인 native 체크박스. 스크린 리더는 "스위치, 켜짐/꺼짐"으로 읽는다.
- Keyboard·focus: Tab으로 들어가고 Space로 켜고 끈다.
- 터치 영역: 52×28로 WCAG 2.5.8 최소 크기를 충족한다.
- 색만으로 전달하지 않는다: 켜짐·꺼짐은 노브 위치로 구분된다.
- 강제 색상 모드: 트랙 테두리와 노브를 `CanvasText`로 칠한다. 실제 고대비 테마 렌더는 확인하지 않았다.

## Styling과 의존성

| Figma          | 값                      | 사용한 토큰·utility                               |
| -------------- | ----------------------- | ------------------------------------------------- |
| 크기           | 52×28, radius full      | `w-s19 h-s13 rounded-full`                        |
| 노브           | 흰 원 20px, 안쪽 여백 4 | `size-s10 top-s2 left-s2 bg-surface-primary`      |
| 켜짐 노브 위치 | 24px 오른쪽             | `peer-checked:translate-x-s12`                    |
| 기본 트랙      | `#535A61`               | `bg-surface-inversed-lighter`                     |
| 비활성 트랙    | `#EAEAEA`(+ 켜짐 10%)   | `bg-surface-disabled`, `overlay-hover`(배경 겹침) |

- dependency 추가 없음. Base UI Switch 대신 Radio·Checkbox와 같은 native input 방식을 썼다. 폼 제출·label 연결이 브라우저 기본으로 동작한다.
- Storybook state matrix: Off·On·Disabled·States(4상태).

## 확인할 항목

- 켜짐·꺼짐 색 (확인 필요, 디자이너): Figma 값대로 기본 상태는 켜짐·꺼짐 모두 트랙이 `#535A61`이고 노브 위치만 다르다. 켜짐을 색으로도 구분할지 확인한다.
- 노브 전환 (제안): Figma에 전환 정의가 없어 150ms ease-out을 넣었다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] Storybook 렌더와 Figma 대조(4상태)
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`, `vitest run src/components/core/checkbox src/components/core/toggle src/components/web/toggleListItem src/icons`(32개 통과). Storybook 렌더를 Chrome에서 Figma 스크린샷과 눈으로 대조했다. 스크린 리더, 고대비 테마, 실기기는 확인하지 않았다.
