# 컴포넌트: PaginationIndicator

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Pagination Indicator`(node `1532:17987`)와 점 하나 `Pagination Indicator Item`(node `1532:17892`). 변형은 인디케이터 `CurrentPage=1~6`, 아이템 `State=Active·Middle·Far`다.
- 의존: `PaginationIndicatorItem`.

## 목적과 범위

### 제공하는 동작

- 여러 페이지(캐러셀·갤러리 등) 중 지금 어디인지를 점 최대 6개로 보여 주는 표시. 현재는 진한 점, 가까운 페이지는 연한 점, 앞뒤에 더 있는 페이지는 4px로 줄어든 가장 연한 점이다.
- 전체 페이지 수(`total`)와 현재 페이지(`current`)를 주면 점 모양을 정한다.

### 제공하지 않는 동작

- 점을 눌러 페이지를 이동하는 동작은 Figma에 없어서 만들지 않았다(표시 전용).
- 전환 애니메이션은 Figma에 없다(점 모양이 바로 바뀐다).
- 페이지 이동 자체(스와이프·버튼)는 호출하는 쪽이 한다.

## Public API

- Props: `total`(필수), `current`(필수, 1부터), `label`(보조 기술이 읽는 글자, 기본 "{현재} / {전체}"), 그리고 native `<div>`의 속성(`className`은 점 묶음에 적용, `role`은 제외).
- `current`가 범위를 벗어나면 1~`total` 사이로 맞추고 소수는 내림한다. `total`이 0 이하면 아무것도 그리지 않는다. 숫자가 아니거나 무한한 `current`는 1페이지로, 그런 `total`은 페이지 없음(0)으로 본다. 빈 문자열 `label`은 이름 없는 이미지가 되지 않도록 기본 글자를 쓴다.
- 호출자 소유 책임: 현재 페이지 값, 읽어 주는 글자의 i18n, 배치(사진 위에 얹을 때의 위치·대비).

## 상태와 동작

- 점 모양은 `PaginationIndicatorItem`의 `active`(6px, `icon-tertiary` `#535A61`), `middle`(6px, `surface-tertiary` `#EAEAEA`), `far`(4px, `surface-secondary` `#F5F5F5`)다. 점 사이 간격은 4px(`s2`)이고 `far`는 세로 가운데에 놓인다.
- 페이지가 6개 이하: 점마다 한 페이지이고 `far`가 없다. 예) 4페이지 중 2페이지는 `MAMM`.
- 페이지가 7개 이상: 점 6개의 창이며 Figma `CurrentPage` 1~6의 여섯 모양을 따른다(A=active, M=middle, F=far).
  - 1~3페이지: 왼쪽부터 채워 `AMMMMF`·`MAMMMF`·`MMAMMF`(오른쪽 끝이 `far`, 뒤에 더 있음).
  - 중간 페이지(4페이지부터 끝에서 세 번째까지): 모두 `FMMAMF`(네 번째 점이 현재, 양쪽 끝이 `far`).
  - 끝에서 두 번째: `FMMMAF`, 마지막: `FMMMMA`(왼쪽만 `far`).
- 점 묶음의 너비는 `far`가 한쪽이면 54px, 양쪽이면 52px, 높이는 6px다.

## 접근성

- Semantic element: 점 묶음 전체가 `<div role="img">`이고 이름은 "{현재} / {전체}"(`label`로 변경)다. 점 하나하나는 `aria-hidden`이다.
- Keyboard·focus: 표시 전용이라 포커스를 받지 않는다. 페이지 이동 조작은 호출하는 쪽이 접근성 있게 제공한다.
- 페이지가 바뀔 때 알려 주는 live region은 없다. 바뀐 내용을 알려야 하면 호출하는 쪽이 페이지 영역에 알림을 둔다.
- 색 대비(토큰 hex로 계산): 점 `#535A61` on `#FFFFFF` 7.0:1이지만 `middle` `#EAEAEA`는 1.2:1, `far` `#F5F5F5`는 1.1:1로 흰 배경에서 거의 보이지 않는다(Figma 값). 위치는 `role="img"`의 글자로도 전달하고 점은 보조 표시다. 어두운 사진 위에 얹을 때의 보이는 정도는 Figma에 없다(확인할 항목).
- 보이는 글자: 점 모양만으로는 `middle`·`far`가 거의 보이지 않아 전체 개수와 앞뒤에 더 있다는 정보가 화면으로는 전달되지 않는다(현재 위치는 `active` 점의 위치로 대략 보인다). 눈으로 보는 사용자에게 "3 / 8" 같은 글자가 필요하면 호출하는 쪽이 화면에 따로 둔다. 기본 이름 "3 / 8"은 스크린 리더에 따라 "3 슬래시 8"로 읽힐 수 있어 한국어 화면에서는 `label`로 "8페이지 중 3페이지"처럼 주는 편이 자연스럽다.
- 고대비(forced-colors) 모드에서는 배경색이 덮어써져 점 모양이 모두 같아지거나 사라질 수 있고 이름만 남는다(확인할 항목).

## Styling과 의존성

- Token: `gap-s2`, 점은 `PaginationIndicatorItem` spec의 `bg-icon-tertiary`·`bg-surface-tertiary`·`bg-surface-secondary`. 점 계산은 `paginationDots.internal.ts`에 있어 공개 API가 아니다. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `CurrentPage=1~6`→`total`이 7 이상일 때의 `current`가 만드는 여섯 모양, `dot1~6`(점 숨김)→페이지 6개 이하.
- Storybook state matrix: `Default`, `Middle`, `Last`, `FewPages`, `SinglePage`, `Matrix`(전체 8페이지의 현재 1~8과 6페이지 이하 모양), `Interactive`(9페이지 이동).

## 확인할 항목

- Figma는 점 6개 창의 여섯 모양(`CurrentPage` 1~6)만 정의하고 전체 페이지 수와의 관계는 없다. 6페이지를 넘을 때 중간 페이지를 모두 네 번째 점에 두고 끝에서 두 번째·마지막만 오른쪽으로 붙이는 규칙, 6페이지 이하에서 `far`를 쓰지 않는 규칙은 제안이다. 디자이너 확인이 필요하다.
- `middle`·`far` 점의 대비가 흰 배경에서 1.1~1.2:1로 낮다. 사진 위에 얹는 용도라면 배경에 따른 색 지침이 필요하다.
- 점이 바뀔 때의 애니메이션 여부.

## 검증

단위 테스트(여섯 모양과 중간 페이지·7페이지·6페이지 이하, 범위 밖 `current`, `total` 0, 소수, 이름과 `label`, 점 개수·간격·`aria-hidden`·크기 클래스)와 Storybook 렌더로 `Matrix`의 모양·크기·색을 Figma 값과 대조했다: 1·2·3페이지 너비 54px(`AMMMMF`류, 점 위치 0·10·20·30·40·50, `far`는 세로 가운데), 중간 너비 52px(`FMMAMF`, 위치 0·8·18·28·38·48), 마지막 54px(`FMMMMA`), 색 `#535A61`·`#EAEAEA`·`#F5F5F5`. 스크린 리더, 실기기는 확인하지 않았다.
