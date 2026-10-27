# 컴포넌트: SuggestedBundleCard

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `SuggestedBundleCard`(node `1667:9510`). 변형은 `Layout=3Photos` × `State=Default·Pressed·Selected` 3개다.
- 의존: `ColorBadge`(멤버 칩), 아이콘 `LinePhotoSmallIcon`·`LineCalendarSmallIcon`·`LineChevronRightMediumIcon`. `LineCalendar*` 3개 크기는 이 작업에서 Figma(`Line/Icon-{S,M,L}/calendar`)를 받아 추가했다.

## 목적과 범위

### 제공하는 동작

- 추천 번들의 대표 사진, 번들 이름, 참여 멤버 칩, 사진 수, 촬영 날짜를 한 장의 카드로 보여 준다.
- 카드 전체를 누르는 버튼(선택 전환)과 오른쪽 화살표 버튼(상세 화면 이동)을 따로 제공한다.
- 멤버가 `maxVisibleMembers`(기본 6)개를 넘으면 마지막 칩이 "마지막 멤버 외 N명"으로 줄어든다.

### 제공하지 않는 동작

- 사진 한 장·두 장 같은 다른 `Layout`은 Figma에 `3Photos`만 있어 만들지 않았다.
- 선택 상태의 보관, 하나만 고르는 그룹 처리, 상세 화면 이동은 호출하는 쪽이 정한다.
- 비활성(`disabled`)은 Figma에 없어 만들지 않았다.

## Public API

- Props: `imageSrc`, `title`, `members`(이름 배열), `photoCount`, `month`, `day`, `selected`(기본 `false`), `maxVisibleMembers`(기본 6), `imageAlt`(기본 빈 문자열), `onCardClick`, `onDetailClick`, 그리고 native `<div>`의 속성(`className`은 카드에 적용).
- Controlled: `selected`는 호출하는 쪽이 보관하고 `onCardClick`에서 바꾼다. 내부 state는 없다.
- 글자: 사진 수는 `{photoCount}장`, 날짜는 `{month}월 {day}일`로 컴포넌트가 만든다. 번들 이름·멤버 이름은 호출하는 쪽이 i18n한다.
- 호출자 소유 책임: 카드 폭(기본 `w-full`, Figma는 348px), 선택 그룹 규칙, 상세 이동.

## 상태와 동작

- Default: 흰 배경(`surface-primary`), 반경 `r8`(16px), 안쪽 여백 `s8`(16px), 요소 간격 `s4`(8px). 사진은 높이 178px·반경 `r4`·`object-cover`. 이름은 `typography-body-1-semi-bold`(16/24, 자간 -0.25px) `text-tertiary`.
- 멤버 칩: `ColorBadge`(lg, weak). Default·Pressed는 `gray`, Selected는 `brand`. 칩 간격 `s3`(6px).
- 사진 수·날짜: 16px 아이콘 + `typography-body-2-regular`(14/21), 사이 간격 `s6`(12px), 아이콘과 글자 2px. Default `text-tertiary`.
- Pressed: 카드 어디를 눌러도(`:active`) 카드 전체에 `overlay-hover`(검정 10%)를 얹어 사진·칩·화살표까지 어두워진다.
- Selected: 이름·화살표·사진 수·날짜가 `text-brand`, 칩 `brand`, 안쪽 1px `border-brand-subtle` 테두리. 안쪽 링이라 선택 전후 레이아웃이 움직이지 않는다.
- 긴 이름: 한 줄로 줄이고(`truncate`) 화살표는 그대로다. 멤버 칩 줄은 넘치면 잘린다(`overflow-hidden`).
- 접근성 이름: 카드 버튼은 이름이 번들 이름이고 `aria-pressed`로 선택을 알린다. 화살표 버튼은 "{번들 이름} 상세 보기"다.

## 접근성

- Semantic element: 카드 안에 버튼 둘(`<button type="button">`)이라 버튼 안에 버튼이 들어가지 않는다. 카드 버튼은 `::after`를 카드 전체로 넓혀 어디를 눌러도 눌리고, 화살표 버튼은 `z-10`으로 그 위에 둔다.
- 멤버 칩은 `<ul aria-label="참여 멤버">`의 항목으로 읽힌다. 멤버가 없으면 목록을 그리지 않는다. `maxVisibleMembers`가 숫자가 아니면 6으로 본다.
- 터치 영역: 화살표 버튼은 보이는 크기 20px(Medium 아이콘)를 두고 터치 영역을 40×40으로 넓혔다(`docs/architecture/design-system-icons.md`의 "크기와 터치 영역" 값). 화살표를 누를 때는 카드 눌림 표시가 나오지 않는다(눌림은 카드 버튼에만 연결).
- 포커스 윤곽선은 카드 바깥 2px라 카드를 `overflow-hidden`으로 감싼 부모 안에 두면 잘릴 수 있다. 호출하는 쪽이 부모 여백을 확인한다.
- 대표 사진은 이름 옆에 있어 기본으로 장식(`alt=""`)이며 필요하면 `imageAlt`를 준다. 아이콘은 모두 `aria-hidden`이다.
- Keyboard·focus: Tab으로 카드 버튼 → 화살표 버튼 순서이고 Enter·Space로 누른다. 카드 버튼 포커스는 카드 바깥 2px `border-brand` 윤곽선으로, 화살표 버튼 포커스는 그 버튼 둘레로 보인다.
- 색 대비(토큰 hex로 계산): 이름·날짜 `#535A61`이 흰 배경에서 7.2:1, Selected 글자 `#454EDF`가 흰 배경에서 6.2:1로 통과한다. 칩은 `ColorBadge` spec의 계산을 따른다(gray 6.4, brand 5.5). Selected 테두리 `#A7ADFF`는 흰 배경에서 약 2.0:1로 비텍스트 대비 3:1에 못 미친다(Figma 값, 확인할 항목). 선택은 글자색과 `aria-pressed`로도 전달된다.

## Styling과 의존성

- Token: `bg-surface-primary`, `rounded-r8`·`rounded-r4`, `p-s8`, `gap-s4`·`gap-s3`·`gap-s6`, `text-text-tertiary`·`text-text-brand`, `bg-overlay-hover`, `ring-border-brand-subtle`, `typography-body-1-semi-bold`·`typography-body-2-regular`.
- 사진 높이 178px는 `h-44.5`, 화살표 20px는 `size-5`다. 눌림 `has-[[data-card-button]:active]`로 카드 버튼의 눌림을 카드에 전달한다.
- 허용되는 dependency 추가 없음.
- Figma 이름 대응: `State`→`selected`(+ 눌림은 `:active`), `title`→`title`, `memberChip1~5`·`moreMembersChip`→`members`, `month`·`day`→`month`·`day`.
- Storybook state matrix: `Default`, `Selected`, `ManyMembers`, `LongTitle`, `States`.

## 확인할 항목

- 멤버 축약 규칙(제안): Figma에는 칩 5개 + "은우 외 2명" 칩 하나가 그려져 있을 뿐 규칙이 없다. 마지막 칩이 "마지막 멤버 외 N명"이 되도록 했고 `maxVisibleMembers`(기본 6, 요약 칩 포함)는 Figma 칩 개수에서 정했다. 실제로 몇 칩을 보일지는 디자이너 확인이 필요하다. 표시 폭을 넘는지 재서 줄이지는 않고 칩 개수로만 줄인다.
- Figma의 `Selected` 카드는 350×308이고 `Default`는 348×308이다. 테두리 1px가 바깥 크기에 들어간 Figma의 부작용으로 보고, 폭은 호출하는 쪽이 정하며 테두리는 안쪽 링으로 그린다.
- 카드를 누르면 Selected로 바뀌고 화살표를 누르면 상세로 이동한다는 동작은 기획 설명을 따른 것이며 Figma에는 상태 3개와 화살표 아이콘만 있다.
- Selected 테두리 대비(위 접근성 항목). 포커스 윤곽선(`border-brand`)과 Selected 테두리(`border-brand-subtle`)가 같은 보라 계열이라 함께 있을 때 구분이 약할 수 있다(시각 확인 필요).
- 눌림 범위: 화살표 버튼을 누를 때 카드 눌림 표시를 내지 않았다. Figma Pressed가 카드 전체 눌림인지 화살표 누름도 포함하는지는 정의가 없다.
- 멤버 칩 하나("마지막 멤버 외 N명")가 여러 사람을 나타내 스크린 리더에는 문구 그대로 읽힌다.
- 대표 사진은 Figma의 샘플 사진을 쓰지 않고 스토리에서 그라데이션 이미지를 쓴다.

## 검증

Storybook을 빌드해 Chrome에서 Figma 내보내기(1배, 배경 `#3A3A3A`)와 Default·Pressed(카드 아래쪽을 누른 채)·Selected를 같은 조건으로 비교했다. 카드 크기는 Default·Pressed 모두 348×308로 같고(Selected는 Figma가 테두리를 바깥 크기에 넣어 350×308이라 폭은 비교하지 않음), 세로 배치(사진 178px·이름 24px·칩 29px·사진 수·날짜 21px, 간격 8px)가 높이 308로 맞아떨어진다. 샘플한 픽셀 색이 모두 같다: 카드 배경 `#FFFFFF`, 눌림 `#E5E5E5`, 눌림 칩 `#DCDCDC`, 칩 `#F5F5F5`, Selected 테두리 `#A7ADFF`, Selected 칩 `#F1F2FF`. 글자 픽셀은 Storybook에 Pretendard가 없어 대체 글꼴로 그려져서 비교하지 않았고, 대표 사진도 Figma의 샘플 사진이 아니라 그라데이션이라 사진 영역은 비교에서 뺐다. 칩의 가로 배치는 글꼴 폭에 따라 달라진다. 스크린 리더, 키보드 포커스 윤곽선의 실제 모양, 실기기 터치, 강제 색상 모드는 확인하지 않았다.
