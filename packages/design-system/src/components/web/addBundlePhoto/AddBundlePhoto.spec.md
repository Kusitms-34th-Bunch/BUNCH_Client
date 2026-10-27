# 컴포넌트: AddBundlePhoto

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Bundle Photo`(node `1439:31041`) 중 `Type=Add`(`Size=M` node `1439:31092`, `Size=S` node `1439:31101`). 같은 `Bundle Photo`의 `Type=Photo`와 요소(`div`와 `button`)가 달라 `BundlePhoto`와 나눴다.
- 의존: 아이콘 `LineAddMediumIcon`.

## 목적과 범위

### 제공하는 동작

- 번들에 사진을 추가하는 정사각 타일 버튼. `surface-secondary` 바탕 한가운데에 흰 더하기 원과 "사진 추가" 글자가 있다.

### 제공하지 않는 동작

- 눌림·호버·비활성 모양은 Figma에 없어서 만들지 않았고 `disabled`는 타입에서 막았다(정해지면 추가).
- 사진을 고르는 동작(앨범·카메라)은 호출하는 쪽이 `onClick`으로 정한다.

## Public API

- Props: `size`(`s` 300px·`m` 330px, 기본 `m`), `label`(기본 "사진 추가"), 그리고 native `<button>`의 속성(`type`은 기본 `button`, `onClick`·`className`·`aria-label` 등. `disabled`는 받지 않음).
- 폭은 `size`가 정하고 높이는 정사각이다. 다른 폭은 `className`(예: `w-full`)으로 덮어쓴다.
- 호출자 소유 책임: 글자의 i18n, 동작, 배치. 사진 개수가 상한에 닿았을 때는 타일을 숨긴다(이 컴포넌트는 `disabled`를 받지 않고 `aria-disabled`를 넘겨도 클릭을 막지 않는다). 긴 글자의 줄바꿈 처리(`break-keep` 등)는 없다.

## 상태와 동작

- 타일: 배경 `surface-secondary`(`#F5F5F5`), 반경 `r4`(8px), 내용을 가로·세로 가운데에 둔다.
- 더하기 원: 36px, 흰색(`surface-primary`), 안의 더하기는 Medium(20px) `icon-primary`다.
- 글자: `typography-body-2-regular`(14/21) `text-primary`, 원과 8px(`s4`) 떨어진다.
- Figma는 이 안쪽이 1.05배로 그려져 있어(더하기 21px, 글자 14.7px/22.05, 간격 7.35px) 토큰 값(20px, 14/21, 8px)과 최대 1px 차이가 난다. 토큰을 바꾸지 않고 가장 가까운 값을 썼다.

## 접근성

- Semantic element: native `<button type="button">`.
- Accessible name·label: 보이는 글자("사진 추가")가 이름이고 더하기 원은 `aria-hidden`이다. 한 화면에 사진 추가가 여럿이면 `aria-label="번들에 사진 추가"`처럼 보이는 글자를 포함한 이름을 준다.
- Keyboard·focus: Tab·Enter·Space로 누르고 포커스는 버튼 바깥 2px `border-brand` 윤곽선이다.
- 터치 영역: 타일 전체(300~330px)다.
- 색 대비(토큰 hex로 계산): 글자 `#121212` on `#F5F5F5` 17.2:1로 통과한다. 흰 원 `#FFFFFF` on `#F5F5F5`는 1.1:1이라 원의 경계가 약하고 타일 `#F5F5F5`와 흰 페이지 배경의 대비도 약해 타일 경계는 글자와 아이콘에 의존하지만, 더하기와 글자가 버튼임을 전달한다(Figma 값).

## Styling과 의존성

- Token: `bg-surface-secondary`·`bg-surface-primary`, `rounded-r4`, `gap-s4`, `text-icon-primary`·`text-text-primary`, `typography-body-2-regular`, 크기는 `w-75`·`w-82.5`·`size-9`. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Size=S·M`→`size`, `Type=Add`→이 컴포넌트, "사진 추가"→`label`.
- Storybook state matrix: `Default`, `Small`, `CustomLabel`(그리고 `BundlePhoto`의 `Matrix`에서 나란히 보기).

## 확인할 항목

- 눌림·호버 모양이 없다. 누르는 순간의 시각 피드백이 필요한지 디자이너 확인이 필요하다.
- 흰 원과 타일의 대비 1.1:1(위 접근성 항목).

## 검증

단위 테스트(이름, 클릭, `label`, 크기·클래스, 포커스 윤곽선 클래스, `type`)와 Storybook 렌더로 치수를 Figma 값과 대조했다: `m` 330×330에서 더하기 원 36px이 가운데(147)에 놓이고 `s` 300×300에서 132, 타일 배경 `#F5F5F5`, 반경 8px, 글자 14/21 `#121212`. 안쪽 요소의 세로 위치는 Figma(1.05배)와 최대 약 1px 차이가 난다. 글자 픽셀은 Pretendard가 없어 비교하지 않았다. 스크린 리더, 실기기 터치, 키보드 포커스 윤곽선의 실제 모양은 확인하지 않았다.
