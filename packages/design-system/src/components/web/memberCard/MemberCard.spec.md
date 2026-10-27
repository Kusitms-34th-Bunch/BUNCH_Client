# 컴포넌트: MemberCard

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Member Card`(node `1266:11811`). 변형은 `Variant=default, Delete=True·False`와 `Variant=add` 3개다. 이 컴포넌트는 `default`(삭제 여부 포함)이고 `add`는 `AddMemberCard`로 나눴다.
- 의존: `ProfileImage`(40px로 줄여 사용), `RoleBadge`(sm), 아이콘 `LineCloseSmallIcon`.

## 목적과 범위

### 제공하는 동작

- 번들에 참여한 멤버 한 명을 76px 폭 카드로 보여 준다: 프로필 사진, 역할 배지(선택), 이름.
- 삭제 버튼(오른쪽 위)은 `onDelete`를 줄 때만 나타난다.

### 제공하지 않는 동작

- 카드 자체를 누르는 동작과 눌림·호버 모양은 Figma에 없어서 만들지 않았다(카드는 `<div>`다).
- 역할 배지 이외의 상태 표시(온라인 등)는 없다.
- 멤버 추가 카드는 `AddMemberCard`다.

## Public API

- Props: `name`(필수), `src`(프로필 이미지 주소, 없으면 배경색 원), `memberRole`(`owner`·`coOwner`·`draftAuthor`, 없으면 배지 없음), `roleLabel`(역할 이름, 주면 배지가 이미지로 읽힘), `onDelete`(주면 삭제 버튼), `deleteLabel`(삭제 버튼 접근성 이름, 기본 "{이름} 삭제"), 그리고 native `<div>`의 속성(`className`은 카드에 적용).
- 이벤트: `onDelete`. Controlled / uncontrolled: 해당 없음.
- 호출자 소유 책임: 이름·역할 이름·삭제 버튼 이름의 i18n, 삭제 확인과 목록 갱신, 카드 배치. 여러 카드를 놓을 때는 `<ul>`/`<li>`로 감싸야 "멤버 N명"으로 읽히고 추가 카드가 끝에 오는 순서도 유지된다(카드는 폭 76px 고정). 삭제 버튼은 카드 밖으로 3px 나가고 32px 터치 영역이 거기서 8px 더 나가 카드 위·오른쪽 가장자리에서 11px까지 터치를 받으며, 포커스 윤곽선은 약 7px까지 그려진다. 컨테이너는 위·오른쪽에 11px 이상 여유를 두고 `overflow`로 자르지 않으며, 오른쪽 이웃 카드(특히 `AddMemberCard` 버튼)와 11px 이상 띄워 터치 영역이 이웃의 클릭을 가로채지 않게 한다.

## 상태와 동작

- 카드: 폭 76px(`w-19`), 배경 `surface-secondary`(`#F5F5F5`), 반경 `r4`(8px), 안쪽 여백 가로 14px(`padding-p7`)·세로 8px(`s4`), 요소 간격 10px(`s5`), 가운데 정렬. 높이는 87px(8+40+10+21+8)이다.
- 프로필: `ProfileImage`를 `size-10`(40px)로 줄이고 1px `border-tertiary` 테두리를 둔다.
- 이름 줄: 배지(16px)와 이름이 2px(`s1`) 간격으로 가운데 놓인다. 이름은 `typography-body-2-regular`(14/21), `text-secondary`(`#25282D`)이고 카드 폭을 넘으면 말줄임(`truncate`)한다.
- 삭제 버튼: 16px 원(`icon-tertiary` 배경 `#535A61`), 안의 X는 흰색이며 오른쪽 위로 3px씩 삐져나온다(`-top-0.75 -right-0.75`). 터치 영역은 보이는 16px보다 넓은 32px(`design-system-icons.md`의 Small 기준)이다.
- Figma의 `Delete=False` 카드는 반경이 `9px`로 그려져 있어 `r4`(8px)로 통일했다(디자이너 확인).

## 접근성

- Semantic element: 카드는 `<div>`, 삭제는 native `<button type="button">`.
- Accessible name·label: 삭제 버튼은 "{이름} 삭제"(기본)이고 X 아이콘은 `aria-hidden`이다. 프로필 사진은 이름 옆에 있어 장식으로 숨기고, 역할 배지는 `roleLabel`을 주면 이미지로 읽히며 없으면 장식이다.
- Keyboard·focus: 삭제 버튼만 Tab·Enter·Space로 누르고 포커스는 버튼 바깥 2px `border-brand` 윤곽선이다.
- 색 대비(토큰 hex로 계산): 이름 `#25282D` on `#F5F5F5` 13.6:1, 삭제 아이콘 흰색 on `#535A61` 7.0:1로 통과한다.

## Styling과 의존성

- Token: `bg-surface-secondary`, `px-padding-p7`·`py-s4`·`gap-s5`·`gap-s1`, `rounded-r4`, `text-text-secondary`, `typography-body-2-regular`, `border-border-tertiary`, `bg-icon-tertiary`·`text-icon-inversed`. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Variant=default, Delete=True·False`→`onDelete` 유무, `roleBadge`→`memberRole`, `name`→`name`.
- Storybook state matrix: `Default`, `WithRoleBadge`, `Deletable`, `LongName`, `Variants`.

## 확인할 항목

- Figma의 삭제 버튼 안 X 아이콘은 `Line/Icon-S/Close`를 6px 상자에 넣고 잘라 낸 모양이다. 구현은 같은 아이콘을 12px로 줄여(X 6px) 같은 중심에 놓았고 선 굵기는 줄어든 비율을 따른다.
- 이름이 길면 말줄임으로 잘린다(배지가 있으면 이름에 쓸 수 있는 폭이 약 30px라 한글 2자 안팎). Figma에는 긴 이름 처리가 없어 전체 이름을 보여 줄지(상세 화면 등)와 2줄 줄바꿈 여부는 디자이너 확인이 필요하다. 스크린 리더는 전체 이름을 읽는다.
- 역할 배지는 Figma에 왕관(번치장)만 있고 다른 역할은 `RoleBadge`가 제공하는 모양을 그대로 쓴다.

## 검증

단위 테스트(이름·사진·배지·삭제 버튼의 유무와 이름, 클릭, 크기 클래스)와 Storybook 렌더로 `Variants`의 치수와 색을 Figma 값과 대조했다: 기본 카드 76×87, 프로필 40px(x 18, y 8), 이름 줄 y 58, 배지 16px, 이름 14/21 `#25282D`, 삭제 버튼 16px(63, -3, `#535A61`), 카드 배경 `#F5F5F5`, 프로필 테두리 `#EAEAEA`. 글자·사진 픽셀은 Pretendard와 Figma의 샘플 사진이 없어 비교하지 않았다. 스크린 리더, 실기기 터치, 키보드 포커스 윤곽선의 실제 모양은 확인하지 않았다.
