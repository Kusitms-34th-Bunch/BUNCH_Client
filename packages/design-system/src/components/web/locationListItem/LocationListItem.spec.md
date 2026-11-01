# 컴포넌트: LocationListItem

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `LocationListItem`(node `1853:26830`). 변형 없이 한 가지 모양이다.

## 목적과 범위

### 제공하는 동작

- 장소 검색 결과·목록에서 한 장소를 보여 주는 줄. 장소 이름과 주소를 세로로 쌓고 아래에 구분선이 있다.

### 제공하지 않는 동작

- 누르는 동작과 눌림·호버·선택 모양은 Figma에 없어서 만들지 않았다. 줄은 표시용이고, 눌러서 장소를 고르는 동작은 호출하는 쪽이 줄을 `<button>`·`<a>`로 감싸서 정한다. `<button>` 안에 `<div>`·`<p>`를 넣으면 유효하지 않은 HTML이라 이 컴포넌트는 `<span>`만 쓴다.
- 장소 이름과 주소에서 검색어를 강조하는 표시는 Figma에 없다.

## Public API

- Props: `placeName`(필수), `address`(필수), 그리고 native `<span>`의 속성(`className`은 줄에 적용).
- 호출자 소유 책임: 장소 이름·주소의 i18n과 형식, 누르는 동작과 그 접근성(`<button>`·`<a>`로 감싸기), 목록 구조(`<ul>`/`<li>`). 선택된 줄이 있으면 색만으로 전달하지 않고 `aria-current`·`aria-selected` 같은 상태도 호출하는 쪽이 준다. 감싸는 `<button>`·`<a>`는 줄 전체가 포커스·눌림 영역이 되도록 `display: block`(또는 `w-full`)으로 둔다.

## 상태와 동작

- 줄: 흰 배경(`surface-primary`), 안쪽 여백 16px(`s8`), 아래 1px `border-tertiary`(`#EAEAEA`) 구분선, 폭은 부모를 채운다(Figma 375px). 높이는 16 + 22 + 18 + 16 + 구분선 1 = 73px다.
- 장소 이름: 15/22, 굵기 600(SemiBold), 자간 -0.25px, `text-secondary`(`#25282D`). 길면 한 줄로 줄인다(`truncate`).
- 주소: `typography-body-4-regular`(13/18, 400), `text-quaternary`(`#969AA0`). 길면 한 줄로 줄인다.
- Figma는 글자를 줄이지 않고 줄바꿈 없이(`whitespace-nowrap`) 그렸다. 길이가 넘칠 때의 처리는 정의가 없어 말줄임으로 했다(확인 항목).

## 접근성

- Semantic element: `<span>` 안의 두 `<span>`(장소 이름, 주소 순서로 읽힘)이고 `display`만 블록·flex로 쌓아 `<button>`·`<a>` 안에서도 유효하다. 목록 의미는 호출자가 `<ul>`/`<li>`로 준다.
- Accessible name·label: 글자가 그대로 이름이다. 잘린 글자도 DOM에는 전체가 있어 스크린 리더는 전체를 읽는다. 눈으로는 잘린 뒷부분을 볼 방법이 없고 확대(WCAG 1.4.4·1.4.10)나 좁은 화면에서도 정보가 줄어든다. 한국어 주소는 끝(번지)이 구분 정보인 경우가 많은데 그 부분이 먼저 잘린다(확인 항목). `title`은 터치·키보드에서 동작하지 않아 해결책이 아니다.
- Keyboard·focus: 표시 전용이라 포커스를 받지 않는다. 호출하는 쪽이 감싸는 `<button>`·`<a>`가 포커스를 받는다.
- 색 대비(토큰 hex로 계산): 장소 이름 `#25282D` on `#FFFFFF` 14.8:1로 통과한다. 주소 `#969AA0` on `#FFFFFF`는 2.8:1로 일반 텍스트 AA(4.5:1)에 못 미친다(Figma 값, 확인할 항목).

## Styling과 의존성

- Token: `bg-surface-primary`, `p-s8`, `border-border-tertiary`, `text-text-secondary`, `typography-body-4-regular`, `text-text-quaternary`, `typography-login-button`(15/22). 허용되는 dependency 추가 없음.
- 장소 이름의 15/22 SemiBold(자간 -0.25px)와 같은 `typography-*` token이 없어서, 같은 15/22·자간 -0.25인 `typography-login-button`(굵기 500)을 쓰고 굵기만 `font-(--semantic-font-weights-pretendard-1)`(600)로 덮어썼다. Figma의 Body-2-Semibold(15/22)에 해당하는 token은 디자이너·토큰 정리가 필요하다.
- 주소 색은 Figma 변수 `text-quaternary`(`#969AA0`)를 그대로 쓴다.
- Figma 이름 대응: `placeName`→`placeName`, `address`→`address`.
- Storybook state matrix: `Default`, `LongText`, `List`.

## 확인할 항목

- 15/22 SemiBold token(위 Styling 항목)과 주소 색 token 이름.
- 주소 글자 대비 2.8:1(위 접근성 항목).
- 긴 이름·주소의 처리(말줄임 vs 줄바꿈)와 잘린 글자를 보는 방법.
- 눌림·선택 모양이 필요한지(장소를 고르는 목록이라면 눌림 피드백이 필요할 수 있다).

## 검증

단위 테스트(이름·주소·읽는 순서, 줄 클래스, 이름·주소 타이포 클래스, 말줄임, `className`)와 Storybook 렌더로 Figma 값과 대조했다: 줄 375×73(이름 y 16 높이 22, 주소 y 38 높이 18, 여백 16px), 배경 `#FFFFFF`, 아래 구분선 1px `#EAEAEA`, 이름 15/22 weight 600 자간 -0.25 `#25282D`(굵기 덮어쓰기가 적용된 계산값 확인), 주소 13/18 weight 400 `#969AA0`. 글자 픽셀은 Pretendard가 없어 비교하지 않았다. 스크린 리더, 실기기는 확인하지 않았다.
