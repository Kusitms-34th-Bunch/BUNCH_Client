# 컴포넌트: PageCounter

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Page Counter`(node `3043:65937`). 변형 없이 한 가지 모양이고 숫자 두 개(현재·전체)만 바뀐다. `Bundle Photo`(node `1439:31041`)의 `Size=M, Type=Photo` 왼쪽 아래에서 쓰인다.

## 목적과 범위

### 제공하는 동작

- 사진 위에 얹어 "1/4"처럼 현재 위치를 알리는 반투명 알약.

### 제공하지 않는 동작

- 페이지를 넘기는 동작은 없다(표시용). 사진을 넘기는 UI와 현재 값은 호출하는 쪽이 정한다.
- 사진 위의 위치는 정하지 않는다. `BundlePhoto`는 왼쪽 아래에 둔다.
- 값 범위 보정(0, 전체보다 큰 현재 등)은 하지 않고 받은 숫자를 그대로 보여 준다.

## Public API

- Props: `current`(필수, 1부터), `total`(필수), `label`(읽어 주는 글자, 기본 "{현재} / {전체}"), 그리고 native `<span>`의 속성(`className`은 알약에 적용, `children`·`role`은 받지 않는다).
- 호출자 소유 책임: 값 계산, 읽어 주는 글자의 i18n(`label`), 사진 위 배치.

## 상태와 동작

- 알약: `rounded-full`, 좌우 12px(`px-s6`)·위아래 4px(`py-s2`), 배경 검정 30%, 배경 블러 5px, 글자 `typography-body-4-regular`(13/18) 흰색(`text-text-inversed`). 인라인 요소(`inline-flex`)라 내용에 맞는 크기(Figma 1/4 = 44×26)다.
- 글자: `{current}/{total}`을 붙여 쓴다(공백 없음, Figma와 같음).
- 두 자리 숫자는 알약이 가로로 늘어난다.

## 접근성

- Semantic element: `<span role="img" aria-label>`로 "1 / 4" 같은 이름을 갖는다(`PaginationIndicator`와 같은 방식). 화면의 `1/4` 글자는 `aria-hidden`이라 중복해서 읽히지 않는다.
- Accessible name·label: 기본은 "{현재} / {전체}"이고 `label`로 바꾼다(예: "사진 4장 중 1번째"). 기본 글자는 스크린 리더가 "1 슬래시 4"처럼 읽을 수 있어, 사용처에서는 "4장 중 1장"처럼 문장형 `label`을 넘기는 것이 낫다. 빈 문자열이면 기본 글자로 대체한다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.
- 색 대비: 흰 글자는 뒤 사진에 따라 대비가 달라진다. 검정 30%는 흰 사진 위에서 합성색이 약 `#B3B3B3`이라 흰 글자 대비가 약 2.1:1로 낮다(직접 계산한 값, 렌더로 재지 않음). 밝은 사진에서는 읽기 어려울 수 있다(확인할 항목).

## Styling과 의존성

- Token: `typography-body-4-regular`, `text-text-inversed`, `px-s6`·`py-s2`, `rounded-full`. 배경 검정 30%(`bg-[rgba(0,0,0,0.3)]`)와 블러 5px(`backdrop-blur-[5px]`)는 토큰에 없어 Figma 값을 그대로 쓴다(`primitive-black-alpha`에 30%가 없음). dependency 추가 없음.
- Figma 이름 대응: `currentPage`→`current`, `totalPages`→`total`.
- Storybook state matrix: `Default`, `TwoDigits`.

## 확인할 항목

- 밝은 사진 위 대비(위 접근성 항목) (제안): Figma 값(검정 30%)을 그대로 따랐다. 밝은 사진에서 읽기 어려우면 디자이너와 배경 불투명도를 확인한다.
- 배경 검정 30%·블러 5px에 대응하는 토큰을 만들지 (미정): 디자인 시스템 토큰 담당과 확인.

## 검증

- [x] 사용자 관찰 동작 test 작성(표시 글자, 접근성 이름·`label`, 알약 클래스, `className`)
- [x] 지원 variant·edge state story 작성(`Default`, `TwoDigits`)
- [x] public export 영향 확인(`yarn workspace @app/design-system gen:index`로 `web` barrel에 `pageCounter` 추가)
- [ ] 실행 command와 결과
- [ ] Storybook 렌더를 Figma(44×26)와 대조(미실행)
