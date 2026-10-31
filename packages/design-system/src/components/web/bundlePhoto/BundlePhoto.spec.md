# 컴포넌트: BundlePhoto

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Bundle Photo`(node `1439:31041`). 변형은 `Size=S·M`(`Frame 2147231378`은 M) × `Type=Photo·Add` 4개다. 이 컴포넌트는 `Type=Photo`(M·S)이고 `Type=Add`는 `AddBundlePhoto`로 나눴다.
- 의존: `ProfileImage`(31px로 줄여 사용), `PageCounter`, 아이콘 `LineCloseSmallIcon`.

## 목적과 범위

### 제공하는 동작

- 번들에 담긴 사진 한 장을 반경 8px의 정사각으로 보여 준다. 사진 위에 올린 멤버 아바타(왼쪽 위), 삭제 버튼(오른쪽 위), 페이지 표시 `1/4`(왼쪽 아래)를 얹을 수 있다.

### 제공하지 않는 동작

- 사진 누르기(확대·선택)와 눌림·호버 모양은 Figma에 없어서 만들지 않았다(사진 틀은 `<div>`다).
- 사진 불러오기 실패·로딩 표시는 Figma에 없다.
- 사진 추가 타일은 `AddBundlePhoto`다.

## Public API

- Props: `src`(필수), `alt`(필수, 장식이면 빈 문자열), `size`(`s` 300px·`m` 330px, 기본 `m`), `uploader`(`{ name, src? }`, 주면 아바타), `uploaderLabel`(아바타를 읽어 주는 글자, 기본 "{이름}님이 올린 사진"), `page`(`{ current, total }`, 주면 왼쪽 아래에 페이지 표시), `pageLabel`(기본 "{현재} / {전체}"), `onDelete`(주면 삭제 버튼), `deleteLabel`(기본 "사진 삭제"), 그리고 native `<div>`의 속성(`className`은 사진 틀에 적용).
- 폭은 `size`가 정하고 높이는 정사각(`aspect-square`)이다. 다른 폭이 필요하면 `className`(예: `w-full`)으로 덮어쓴다. 높이(`h-*`·`size-*`)를 `className`으로 정하면 정사각이 깨지므로 폭만 바꾼다. `<img>`의 `loading="lazy"` 같은 속성은 내보내지 않는다(props가 틀 `<div>`용).
- 호출자 소유 책임: 사진 주소·설명·이름·삭제 버튼 이름의 i18n, 삭제 확인과 목록 갱신, 사진 배치(그리드).

## 상태와 동작

- 틀: 정사각, 반경 `r4`(8px), 넘치는 부분은 잘라 낸다(`overflow-hidden`). 사진은 `object-cover`로 채운다.
- Figma는 `Size=M`에만 아바타와 삭제 버튼을 그려 두었지만, 얹힘 여부는 크기와 무관하게 `uploader`·`onDelete`를 줄 때만 나타난다(S에도 줄 수 있다).
- 위쪽 줄: 사진 위 16px(`s8`) 여백, 가로 정렬 가운데. 아바타 31px(1px `border-tertiary`)이 왼쪽에, 삭제 버튼이 오른쪽 끝(`ml-auto`)에 놓인다. 아바타가 없어도 삭제 버튼은 오른쪽에 있다.
- 삭제 버튼: 공용 `DeleteButton`(`web/deleteButton`)의 `size="L" variant="overlay"`를 오른쪽 끝(`ml-auto`)에 둔다(24px 원, 배경 `overlay-scrim`(검정 60%) + 배경 블러 15px, X 흰색 8px, 터치 영역 32px). 모양은 `DeleteButton.spec.md`를 따른다.
- 페이지 표시: `PageCounter`를 사진 왼쪽 아래 16px(`bottom-s8 left-s8`)에 둔다. Figma는 위쪽 줄 아래에 같은 16px 여백으로 쌓은 구조라 아바타·삭제 버튼과 겹치지 않는다. 페이지 정보를 주는 쪽은 호출자이고 사진이 한 장이면 `page`를 주지 않는다.
- 사진이 없는 `uploader`는 배경색 원으로 보인다.

## 접근성

- Semantic element: 틀은 `<div>`, 사진은 `<img>`, 삭제는 native `<button type="button">`.
- Accessible name·label: 사진은 `alt`(비우면 장식으로 숨김), 아바타는 "{이름}님이 올린 사진"(`uploaderLabel`로 변경)이 `alt`라 사진 설명 바로 뒤에서 이름만 읽혀 올린 사람인지 모호해지는 것을 막고, 프로필 사진이 없으면 같은 글자를 `sr-only`로 대신 전달한다(img가 아니라 일반 글자로 읽힌다). 삭제는 "사진 삭제"(`deleteLabel`)이고 아이콘은 `aria-hidden`이다. 삭제 버튼 기본 이름은 어느 사진인지 모르므로, 사진이 여럿인 목록에서는 기본값을 쓰지 말고 호출하는 쪽이 `deleteLabel`에 사진 이름을 넣는다(`alt`가 빈 문자열인 장식 사진이면 구별할 이름이 없어 호출자가 따로 정해야 한다).
- Keyboard·focus: 삭제 버튼만 Tab·Enter·Space로 누르고 포커스는 버튼 바깥 2px `border-brand` 윤곽선이다. 사진이 밝은 배경이면 윤곽선이 잘 안 보일 수 있다(확인할 항목).
- 색 대비: 삭제 아이콘(흰색)은 검정 60% 위에 얹히지만 뒤 사진에 따라 실제 대비가 달라진다. 흰 사진 최악 조건에서 60% 검정 위 합성색은 약 `#666`이고 흰 X의 대비는 약 5.7:1로 비텍스트 대비 3:1을 넘으며 어두운 사진 위에서는 더 높다(직접 계산한 값이고 렌더로 재지 않음). 포커스 윤곽선 `border-brand`는 사진 색이 비슷하면 보이지 않을 수 있다(확인할 항목).

## Styling과 의존성

- Token: `rounded-r4`, `p-s8`, `border-border-tertiary`, `bg-overlay-scrim`, `text-icon-inversed`. 크기는 `w-75`(300px)·`w-82.5`(330px)·`size-7.75`(31px)·`size-6`(24px)로 기본 scale이다. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Size=S·M`→`size`, `Type=Photo`→이 컴포넌트, `avater`→`uploader`, `Delete Button`→`onDelete`.
- Storybook state matrix: `Default`, `WithPage`, `Small`, `DeleteOnly`, `UploaderOnly`, `UploaderWithoutImage`, `Matrix`(Photo M·S와 Add M·S).

## 확인할 항목

- Figma의 `Size=S` 사진은 아바타·삭제 버튼 없이 사진만 있다. 크기와 얹힘이 한 세트인지(S는 목록용, M은 상세용) 디자이너 확인이 필요하다. 구현은 두 가지를 독립으로 두었다.
- 삭제 버튼 대비와 포커스 윤곽선이 밝은 사진 위에서 보이는지.
- Figma의 `Size` 변형 이름 하나가 `Frame 2147231378`로 남아 있다(M으로 읽음).

## 검증

단위 테스트(사진·`alt`·크기·`className` 덮어쓰기, `uploader`·`onDelete`의 유무와 이름, 클릭, 클래스)와 Storybook 렌더로 치수를 Figma 값과 대조했다: `m` 330×330, `s` 300×300, 아바타 31px(16, 16, 테두리 `#EAEAEA`), 삭제 버튼 24px(290, 19.5, 검정 60% + 블러 15px), X 아이콘 8px. 사진은 Figma의 샘플 사진이 아니라 그라데이션이라 사진 픽셀은 비교하지 않았다. 스크린 리더, 실기기 터치, 키보드 포커스 윤곽선의 실제 모양은 확인하지 않았다.
