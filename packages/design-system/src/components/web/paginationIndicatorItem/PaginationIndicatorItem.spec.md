# 컴포넌트: PaginationIndicatorItem

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Pagination Indicator Item`(node `1532:17892`). 변형은 `State=Active·Middle·Far` 3개다. `PaginationIndicator`가 점마다 하나씩 쓴다.

## 목적과 범위

### 제공하는 동작

- 페이지네이션 점 하나. `active`는 현재 페이지(6px 진한 원), `middle`은 가까운 페이지(6px 연한 원), `far`는 앞뒤에 더 있는 페이지(4px 가장 연한 원)다.

### 제공하지 않는 동작

- 눌림·호버·포커스는 없다(표시 전용 `<span>`).
- 점 사이 간격과 배치는 `PaginationIndicator`가 정한다.

## Public API

- Props: `state`(`active`·`middle`·`far`, 기본 `active`), 그리고 native `<span>`의 속성(`className`은 점에 적용).
- 호출자 소유 책임: 점이 의미하는 페이지와 읽어 주는 글자(`PaginationIndicator`가 묶음 전체에 한 번 읽어 준다).

## 상태와 동작

- `active`: 6px(`size-1.5`) 원, 배경 `icon-tertiary`(`#535A61`).
- `middle`: 6px 원, 배경 `surface-tertiary`(`#EAEAEA`).
- `far`: 4px(`size-1`) 원, 배경 `surface-secondary`(`#F5F5F5`).
- 모두 `rounded-full`이고 줄어들지 않는다(`shrink-0`).

## 접근성

- Semantic element: `<span aria-hidden="true">`. 점 하나는 읽히지 않고 뜻은 `PaginationIndicator`의 `role="img"`가 전달한다. 공개 export이므로 호출자가 `aria-hidden`·`role`을 덮어쓸 수 있지만 `PaginationIndicator` 안에서만 쓰는 것을 전제로 한다.
- 색 대비(토큰 hex로 계산): `active` `#535A61` on `#FFFFFF` 7.0:1, `middle` `#EAEAEA` 1.2:1, `far` `#F5F5F5` 1.1:1(Figma 값, 점은 보조 표시).

## Styling과 의존성

- Token: `bg-icon-tertiary`·`bg-surface-tertiary`·`bg-surface-secondary`. 허용되는 dependency 추가 없음.
- Figma의 `Active` 색 `#535A61`은 `surface-inversed-lighter`(이 브랜치에는 없는 token, 같은 값)이고 같은 값인 `icon-tertiary`를 썼다(`CameraButton`과 같은 방식).
- Figma 이름 대응: `State=Active·Middle·Far`→`state`.
- Storybook state matrix: `Active`, `Middle`, `Far`, `States`.

## 확인할 항목

- 점 색의 의미(진함·연함)를 어두운 배경에서도 쓰는지는 Figma에 없다.

## 검증

단위 테스트(상태별 크기·배경 클래스, `aria-hidden`, `className`)와 `PaginationIndicator`의 Storybook 렌더로 크기 6px·6px·4px와 색 `#535A61`·`#EAEAEA`·`#F5F5F5`를 Figma 값과 대조했다. 스크린 리더, 실기기는 확인하지 않았다.
