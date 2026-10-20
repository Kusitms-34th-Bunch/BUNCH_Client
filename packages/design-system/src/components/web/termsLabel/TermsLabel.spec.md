# 컴포넌트: TermsLabel

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 픽셀 실측과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Terms Label`(node `796:4758`). Figma 상태 이름 `Disabled` / `Default` / `Pressed`를 코드 상태로 옮겨 쓴다(아래 "상태와 동작"). Figma 이름과 코드 이름이 같다.
- 화면설계서: 이용약관 화면의 "이용약관 동의" 영역(설계서 프레임 `796:9226`, node `796:6361`).

## 목적과 범위

### 제공하는 동작

- 343px 폭의 약관 동의 행. 체크 아이콘, 태그(예: "[필수]"), 약관 이름, 그리고 선택적인 오른쪽 chevron 버튼(약관 내용 보기).
- 체크 아이콘이 있는 왼쪽 영역을 눌러 체크를 켜고 끈다. chevron 버튼은 체크 상태를 바꾸지 않는다.
- 설계서: "서비스 이용 약관", "개인정보 수집 및 이용 동의"는 각각 연결되는 페이지가 있다.

### 제공하지 않는 동작

- 약관 페이지 이동은 화면(feature)이 `onViewTerms`로 처리한다. Figma에는 chevron 동작이 정의돼 있지 않다.
- 하위 약관이 모두 선택되면 `Label`을 선택하는 연동, 시작하기 버튼 활성화는 화면이 맡는다.
- Figma에 별도 비활성 시각 표현은 없다(선택 전 모양이 이미 흐리다).

## Public API

- Props: `children`(필수, 약관 이름), `tag`(예: "[필수]"), `onViewTerms`(있을 때만 chevron 버튼을 그림), `viewLabel`(chevron 버튼의 접근성 이름, 기본 "약관 내용 보기"), 그리고 native `<input type="checkbox">`의 속성(`checked`, `defaultChecked`, `onChange`, `disabled`, `name` 등). `className`은 행 전체에 적용한다.
- 호출자 소유 책임: 태그·약관 이름 문구(i18n), 약관 페이지 이동, 하위·전체 선택 연동, `viewLabel` 문구.

## 상태와 동작

Figma 상태 이름은 의미와 다르다. 사용자가 정리해 준 대응은 다음과 같다.

| Figma 상태 | 코드 상태 | 모양                                                                      |
| ---------- | --------- | ------------------------------------------------------------------------- |
| `Disabled` | 선택 전   | 아이콘 `#bcbec2` 40% 불투명, 글자 `text-disabled`                         |
| `Default`  | 선택됨    | 아이콘 `#bcbec2` 80% 불투명, 글자 `text-secondary`                        |
| `Pressed`  | 누르는 중 | 선택된 모양에 검정 10% 오버레이(아이콘 `#919395`, 행 배경이 10% 어두워짐) |

- 눌림은 선택 전·후 어느 쪽에서 눌러도 같은 모양이다. 오버레이는 아이콘·글자·chevron 위까지 덮는다.
- 전환: 설계서의 "Smart Animate / Ease out / 100ms"에 맞춰 오버레이를 100ms ease-out으로 바꾼다.
- `disabled`를 넘기면 native 대로 체크되지 않고 `cursor-not-allowed`다. 별도 시각은 없고, 눌러도 눌림 모양이 나오지 않는다.
- 눌림 오버레이와 선택된 모양은 체크 영역(label)을 누를 때만 나온다. chevron 버튼을 누를 때는 나오지 않는다(체크 상태가 바뀌지 않기 때문).
- 긴 약관 이름: 줄바꿈되어 모두 보이고 chevron은 밀려나지 않는다.

## 접근성

- Semantic element: `<label>` 안의 native `<input type="checkbox">`(시각적으로 숨김)와, 있을 때 별도의 native `<button>`(chevron). 접근성 이름은 태그와 약관 이름이고 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab으로 체크박스, 다시 Tab으로 chevron 버튼. Space로 체크 토글, Enter·Space로 약관 보기. 포커스 링은 체크박스는 라벨 영역에, 버튼은 자체에 그린다.
- 선택 상태는 native `checked`로 전달된다. 색만으로 전달하지 않는다(글자 색과 함께 `checked` 속성).
- 터치 영역: chevron 버튼은 보이는 20px보다 넓은 가로 44px·세로 32px(`after`)다.

## Styling과 의존성

- Token: `px-padding-p4`, `py-padding-p2`, `gap-s3`·`gap-s2`, `typography-body-2-regular`, `text-text-disabled`·`text-text-secondary`, `text-icon-quaternary`, `--semantic-opacity-disabled`·`--semantic-opacity-semi-opaque`, `before:bg-overlay-dim-subtle`. 아이콘은 `FillCircleCheckMediumIcon`, `LineChevronRightMediumIcon`(기존 20px 아이콘).
- dependency 추가 없음.
- Storybook state matrix: `Default`, `Checked`, `WithoutViewButton`, `List`, `LongLabel`.

## 확인할 항목

- 선택 방식 (확정): 설계서가 약관마다 각각 체크하는 방식이라 체크박스로 구현했다. 이슈 #41의 "단일 선택"은 `Year Option`에만 해당한다.
- 약관 보기 버튼 (제안): Figma의 chevron은 `showIcon` boolean인데 동작이 없다. 설계서에 약관마다 연결되는 페이지가 있다고 해서 `onViewTerms`가 있을 때만 별도 버튼으로 그렸다. 행 전체를 링크로 쓸지는 디자이너 확인.
- 태그 (제안): Figma의 "[필수]"는 두 글자 조각으로 나뉘어 있어 문구를 `tag` prop으로 받는다.
- chevron 터치 영역 (제안): 약관 행이 29px이고 행 간격이 8px라 chevron 영역을 가로 44px·세로 32px로 줄였다. 체크 영역(label)과 겹치지 않도록 둘 사이를 12px 띄웠다. 이웃 행과 겹치는지는 쓰는 화면에서 확인한다.
- 눌림 중 아이콘 교체 (제안): 설계서가 Pressed를 선택된 모양으로 보여 주므로 눌러서 선택되는 순간의 모양을 미리 보여 주는 것으로 해석했다.
- 비활성 시각 (제안): Figma에 별도 비활성 표현이 없어 만들지 않았다.
- 선택 전 대비 (미정): 선택 전 글자(`text-disabled`)는 흰 배경에서 약 2.7:1, 아이콘은 40% 불투명이라 비텍스트 3:1에도 못 미친다. Figma 값 그대로라 디자이너 확인이 필요하다.
- 선택 여부 전달 (미정): 선택 전후로 같은 체크 아이콘의 불투명도(40%→80%)와 글자 색만 달라 형태 단서가 없다. 스크린 리더에는 native `checked`가 전달된다. 선 아이콘 같은 형태 단서는 디자이너 확인이 필요하다.
- 클릭 영역 (확정): 행의 위·왼쪽 여백을 label 안에 두어 label이 행 높이(29px)를 모두 덮는다.
- 키보드 누름 (미검증): Space 누름의 `:active` 처리는 브라우저마다 다르다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `web` barrel에 `termsLabel` 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(237 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 무관)·`gen:index:check`, `node turbo/workflows/check-ds-components.mjs`
- [x] Storybook 렌더 확인: Figma 픽셀 실측과 실제 렌더 픽셀 대조(선택 전·선택됨·눌림의 아이콘 색, 눌림 배경 일치). 포커스·실기기는 미검증
