# 컴포넌트: BundleTitle

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `BundleTitle`(node `1287:12412`). 변형 없이 한 가지 모양이고 `icon`·`required`·`showAvatar1~8`을 켜고 끈다.
- 의존: `ProfileImage`(24px로 줄여 사용), 아이콘 `LineMapPinSmallIcon`. `LineMapPin*` 3개 크기는 이 작업에서 Figma(`Line/Icon-{S,M,L}/map-pin`)를 받아 추가했다(이슈 #88 브랜치의 같은 커밋을 가져옴).

## 목적과 범위

### 제공하는 동작

- 번들 항목(사진·장소 등) 위에 놓는 제목 줄. 위치 핀, 제목, 필수 별표, 오른쪽에 겹쳐 놓은 멤버 아바타로 이뤄진다.
- 입력창의 이름표로 쓸 수 있다(`titleId`로 입력창이 제목을 가리킴).

### 제공하지 않는 동작

- 눌러서 동작하는 기능은 없다(표시용).
- 8명을 넘는 멤버의 "외 N명" 같은 축약 표시는 Figma에 없어서 만들지 않았다. 8명까지만 보인다.
- 제목 줄 전체의 클릭·펼치기는 호출하는 쪽이 정한다.

## Public API

- Props: `title`(필수), `titleId`(제목 글자 요소의 id), `icon`(기본 `true`), `required`(기본 `false`), `requiredLabel`(기본 "필수"), `members`(`{ name, src? }` 배열, 앞의 8명만 보임), `membersLabel`(아바타 목록 이름, 기본 "멤버"), 그리고 native `<div>`의 속성(`className`은 줄에 적용).
- `BUNDLE_TITLE_MAX_AVATARS`(8)도 함께 내보낸다.
- 호출자 소유 책임: 제목·필수·멤버 이름의 i18n, 보여 줄 멤버 선정(8명 초과 처리), 입력창과의 연결.

## 상태와 동작

- 줄: 높이 25px(`h-6.25`), 제목 그룹과 아바타 사이 8px(`s4`), 세로 가운데 정렬. 너비는 부모를 채우지 않고 내용에 맞춘다.
- 제목 그룹: 핀(16px, `icon-primary`)과 제목 사이 4px(`s2`), 제목과 별표 사이 2px(`s1`).
- 제목: `typography-body-2-meduim`(14/21, 600, 자간 -0.5px — 이름은 철자 오류지만 값이 Figma Body-3-SemiBold와 같다), `text-secondary`(`#25282D`). 길면 한 줄로 줄인다.
- 별표: `icon-brand`(`#454EDF`) 16px, 스크린 리더에는 숨기고 "필수"를 따로 읽어 준다.
- 아바타: 24px 원(1px `border-tertiary`), 앞의 8명까지 오른쪽으로 8px씩 겹친다(뒤에 오는 아바타가 위). 8명이면 너비가 정확히 136px(`24×8 − 8×7`)다.

## 접근성

- Semantic element: 줄은 `<div>`, 제목은 `<span>`, 아바타는 `<ul aria-label>` 안의 `<li>`.
- Accessible name·label: 아바타는 멤버 이름을 대체 텍스트로 가져 "멤버, 목록 8개 항목"처럼 읽힌다. 사진(`src`)이 없는 멤버는 `ProfileImage`가 `img`를 그리지 않으므로 이름을 `sr-only` 글자로 대신 전달한다. 핀·별표는 장식이고 필수는 "필수"로 읽는다. 제목은 입력창 위의 이름표로 쓰려면 `titleId`를 입력창의 `aria-labelledby`에 연결한다(제목은 `<label>`이 아니라서 `htmlFor`로는 연결되지 않는다).
- 제목 글자가 헤딩이 아니라서 화면 구조(헤딩 계층)에 들어가지 않는다. 헤딩이 필요하면 호출하는 쪽이 감싼다. 제목을 입력창의 `aria-labelledby`로 가리키면 입력창 이름이 제목 글자("사진")만 되고 "필수"는 제목 span 바깥(형제)에 있어 빠지므로, 필수 상태는 입력창에 `required`·`aria-required`로 따로 준다. 같은 멤버 이름이 입력값·칩 등 다른 곳에도 나오는 화면에서는 이 목록과 낭독이 겹칠 수 있다(호출하는 쪽이 판단).
- 멤버가 8명을 넘으면 앞의 8명만 보이고 나머지는 화면과 스크린 리더 모두에 전달되지 않는다(목록이 "8개 항목"으로 읽혀 실제 인원보다 적게 안내된다). 호출하는 쪽이 `membersLabel`에 전체 인원을 넣거나 별도 안내를 둔다(예: `membersLabel="멤버 9명 중 8명"`).
- 색 대비(토큰 hex로 계산): 제목 `#25282D` on `#FFFFFF` 14.8:1, 별표 `#454EDF` on `#FFFFFF` 6.2:1로 통과한다. 겹친 아바타 테두리 `#EAEAEA`는 흰 배경 위에서 1.2:1로 비텍스트 대비 3:1에 못 미치지만 사진이 형태를 만든다(Figma 값, 확인할 항목).

## Styling과 의존성

- Token: `text-text-secondary`·`text-icon-primary`·`text-icon-brand`, `gap-s1`·`gap-s2`·`gap-s4`, `border-border-tertiary`, `typography-body-2-meduim`·`typography-body-1-semi-bold`. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `icon`→`icon`, `required`→`required`, `title`→`title`, `showAvatar1~8`→`members`(앞에서부터 개수만큼).
- Storybook state matrix: `Default`, `WithMembers`, `OneMember`, `MoreThanEight`, `Plain`, `LongTitle`, `Matrix`(핀 × 필수 표시 × 멤버 0·1·3·8명).

## 확인할 항목

- 별표는 Figma에서 `Wanted Sans Variable` 16/22(자간 -0.17px)이지만 repo에 이 글꼴이 없어 Pretendard `typography-body-1-semi-bold`(16/24, 자간 -0.25px)로 그렸다. 디자이너 확인이 필요하다.
- 8명을 넘는 멤버의 처리(축약 표시 여부)는 Figma에 없다.
- 아바타 테두리 대비(위 접근성 항목)와, 사진이 없을 때의 배경색 원(`surface-brand-subtle-2`) 대비.
- 이슈 #88의 `SelectionField`가 같은 제목 영역(핀·제목·별표)을 따로 그리고 있어, 이 컴포넌트가 머지되면 `BundleTitle`을 쓰도록 바꾼다.

## 검증

단위 테스트(제목 스타일, 줄 크기, 핀 유무, `titleId`, 필수 별표 읽힘, 아바타 목록·이름·겹침·8명 제한·이미지 없음, `className`)와 Storybook 렌더로 치수와 스타일을 Figma 값과 대조했다: 줄 높이 25px, 핀 16px, 제목 14/21 600 자간 -0.5 `#25282D`, 별표 `#454EDF`, 별표와 아바타 사이 8px, 아바타 24px을 16px 간격으로 겹쳐 8명의 너비 136px. 글자 픽셀은 Pretendard가 없어 비교하지 않았고 Figma의 샘플 프로필 사진도 쓰지 않았다. 스크린 리더, 실기기는 확인하지 않았다.
