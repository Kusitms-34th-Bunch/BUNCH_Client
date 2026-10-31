# 컴포넌트: SelectionFieldGroup

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Selection Field Group`(node `3021:60643`). 변형은 `Count=1·2·3` 세 개다.
- 조합하는 컴포넌트: 각 행은 `SelectionField`(`web/selectionField`)를 그대로 쓰고, "추가" 행만 이 컴포넌트가 그린다. 아이콘은 `LineAddSmallIcon`(기존).

## 목적과 범위

### 제공하는 동작

- 같은 종류의 값(예: 위치)을 여러 개 고를 때 고른 값들을 `SelectionField`(선택됨) 행으로 한 카드에 쌓은 목록. 모든 행은 값과 지우기 버튼을 보인다. 값은 맨 아래 "+ 추가" 행을 눌러 호출하는 쪽의 검색 화면(장소는 오픈 API 검색)에서 고르므로 값이 비어 있는 행은 없다.
- `onAdd`를 주면 맨 아래에 "+ 추가" 행이 나타난다.
- Figma 변형을 표현한다: `Count=1`(값 1 + 추가), `Count=2`(값 2 + 추가), `Count=3`(최대 개수라 추가 행 없이 값 셋). Figma `Count=3`의 가운데 "위치 추가 >" 행은 검색 화면에서 고르는 구조라 만들지 않았다.

### 제공하지 않는 동작

- 값의 보관, 최대 개수 제한, 값을 고르는 화면(바텀시트·검색 등)은 만들지 않았다. 호출하는 쪽이 `items`를 정하고 콜백으로 처리한다. 최대 개수에서는 호출하는 쪽이 `onAdd`를 주지 않는다.
- 행 순서 변경, 중복 값 검사, 필수 표시, 추천 칩은 없다(Figma에 없음).
- 눌림·호버·비활성·오류 모양은 Figma에 없어서 만들지 않았다.

## Public API

- Props: `items`(`{ id, value }` 배열, 필수, `value`는 고른 값), `fieldLabel`(각 행 버튼 이름 앞에 붙는 보이지 않는 이름), `groupLabel`(주면 `role="group"`의 이름), `onItemClick(id)`, `onItemClear(id)`, `clearLabel(값, 행 순서)`(기본 "{값} 지우기"), `onAdd`(주면 추가 행), `addLabel`(기본 "추가"), 그리고 native `<div>`의 속성(`className`은 카드에 적용, `children`은 받지 않는다).
- 행이 하나도 없으면(`items`가 비고 `onAdd`도 없음) 아무것도 그리지 않는다.
- 호출자 소유 책임: 값 보관, 최대 개수, 값 선택 동작, 문구의 i18n. 지우기·추가로 행이 사라지거나 늘면 포커스가 `body`로 떨어지므로 호출하는 쪽이 포커스를 옮겨 준다(`SelectionField`와 같음).

## 상태와 동작

- 카드: 폭은 부모를 채운다(Figma 376px). 행은 `SelectionField`(`surface-secondary`, 좌우 14px, 위아래 10px, 높이 44px)이고, 그룹 높이는 행 수 × 44px다(Figma 88·132·132).
- 모서리: 맨 위 행은 위쪽, 맨 아래 행은 아래쪽만 반경 `r5`(10px)이고 가운데 행은 각지다. 행이 하나면 모두 둥글다. 추가 행도 맨 아래 행으로 센다.
- 구분선: 두 번째 행부터 위쪽에 흰색(`surface-primary`) 1px 선을 좌우 16px 안쪽(`inset-x-4`)에 그린다. 선은 행 높이에 포함되지 않는다(Figma도 그룹 높이가 행 수 × 44px).
- 추가 행: 높이 44px, 왼쪽에 `LineAddSmallIcon`(16px, `icon-quaternary`)과 "추가" 글자(`typography-body-3-regular`, `text-quaternary`)가 6px(`s3`) 간격으로 놓인다. 화살표는 없다.
- 행은 모두 `SelectionField`의 `selected=true`(값 + 지우기)다. 행 제목은 `SelectionField`처럼 Weak(Regular)다. 행을 누르면 `onItemClick(id)`로 값을 바꾸러 가는 동작을 호출자가 정한다.

## 접근성

- Semantic element: 카드는 `<div>`이고 `groupLabel`을 주면 `role="group"` + `aria-label`이다. 행은 `SelectionField`의 빈 버튼 + 지우기 버튼 구조 그대로이고, 추가 행은 native `<button type="button">`이다.
- Accessible name·label: 행은 `fieldLabel` + 제목으로 "위치: 서울특별시 여의도동"처럼 읽히고, 지우기는 "{값} 지우기"다. 같은 값이 여러 행에 있으면(예: 서울특별시 여의도동 두 번) 행 이름과 지우기 이름이 같아 어느 행인지 구별할 수 없다. 지우기 이름은 `clearLabel(값, 행 순서)`로 "1번째 위치 지우기"처럼 구별할 수 있다. 행 버튼 이름("위치: 서울특별시 여의도동")은 구별되지 않으므로 같은 값을 허용하는 화면은 값에 구별 글자를 붙이거나 중복을 막는다. 추가 행은 "추가"만 읽혀 무엇을 추가하는지 모호하므로 `addLabel`에 "위치 추가"처럼 넣는 것이 낫다.
- Keyboard·focus: Tab 순서는 위에서 아래로 행 버튼 → (값 있는 행) 지우기 → … → 추가 행이다. 행들이 맞붙어 있어 포커스된 행은 `has-focus-visible:z-10`으로 위로 올려 윤곽선이 이웃 행에 가려지지 않게 했다(이웃 행 위에 2px 겹쳐 그려짐). 행 모서리는 각져도 포커스 윤곽선은 `SelectionField` 버튼의 반경(`r5`)을 따라 둥글다(확인할 항목, 실제 브라우저 포커스로 확인 전).
- 색 대비(토큰 hex로 계산): 추가 행 글자 `#BCBEC2` on `#F5F5F5`는 약 1.7:1로 4.5:1에 크게 못 미친다(Figma 값, 확인할 항목). 제목은 `SelectionField` 값(13.6:1)과 같다.

## Styling과 의존성

- Token: `bg-surface-secondary`·`bg-surface-primary`(구분선), `rounded-r5`, `px-s7`·`py-s5`·`gap-s3`, `text-text-quaternary`, `text-icon-quaternary`, `typography-body-3-regular`. 높이 44px는 기본 scale(`h-11`)이다. dependency 추가 없음.
- Figma 이름 대응: `Count`→`items` 길이와 `onAdd` 유무, 값 있는 행→`items`의 `value`, "+ 추가" 행→`onAdd`. 값 없는 행(`위치 추가 >`)은 대응하지 않는다.
- Storybook state matrix: `Count1`, `Count2`, `Count3`, `OneRow`, `Interactive`.

## 확인할 항목

- `Count=3`의 가운데 "위치 추가 >" 행 (확정): 장소 추가는 "추가" 행을 눌러 검색 화면(오픈 API)에서 고르는 구조라 별도 빈 행은 필요 없다고 정했다(요청자 확인). 그래서 `items`의 `value`는 필수다.
- 추가 행 글자 색 대비(위 접근성 항목)와, Figma 변수 `text-quaternary`가 실제로 `#969AA0`을 가리키는 반면 repo의 `text-quaternary` 토큰은 `#BCBEC2`(gray-400)라서 값이 다르다 (미정): 디자인 시스템 토큰 담당과 확인한다. 일단 repo 토큰(`AddMemberCard`와 같은 선례)을 썼다.
- 값이 있는 행을 눌렀을 때 동작(값 바꾸기)은 Figma에 없어 호출자가 정한다 (제안).

## 검증

- [x] 사용자 관찰 동작 test 작성(행 모양·이름, 클릭·지우기·추가 콜백, 모서리·구분선 클래스, `groupLabel`, 빈 목록, `className`)
- [x] 지원 variant·edge state story 작성(`Count1`·`Count2`·`Count3`·`OneRow`·`Interactive`)
- [x] public export 영향 확인(`yarn workspace @app/design-system gen:index`로 `web` barrel에 `selectionFieldGroup` 추가)
- [ ] 실행 command와 결과
- [ ] Storybook 렌더를 Figma와 대조(미실행)
