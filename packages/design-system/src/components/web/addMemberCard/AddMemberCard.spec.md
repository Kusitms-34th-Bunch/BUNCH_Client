# 컴포넌트: AddMemberCard

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Member Card`(node `1266:11811`) 중 `Variant=add`(node `1240:9622`). 같은 `Member Card`의 `default`와 모양·요소(`div`와 `button`)가 달라 `MemberCard`와 나눴다.
- 의존: 아이콘 `LineAddMediumIcon`.

## 목적과 범위

### 제공하는 동작

- 멤버 목록 끝에서 멤버를 추가하는 버튼. 흰 카드에 더하기 원과 "추가" 글자가 있다.

### 제공하지 않는 동작

- 눌림·호버·비활성 모양은 Figma에 없어서 만들지 않았다.
- 어떤 멤버를 어떻게 추가하는지(초대 화면 이동 등)는 호출하는 쪽이 `onClick`으로 정한다.

## Public API

- Props: `label`(기본 "추가"), 그리고 native `<button>`의 속성(`type`은 기본 `button`, `onClick`·`className`·`aria-label` 등. `disabled`는 모양이 없어 받지 않음).
- 이벤트: native `onClick`. Controlled / uncontrolled: 해당 없음.
- 호출자 소유 책임: 글자의 i18n, 동작, 배치. 목록 안에서 무엇을 추가하는지 분명히 하려면 보이는 글자는 "추가"로 두고 `aria-label="멤버 추가"`처럼 보이는 글자를 포함한 이름을 준다.

## 상태와 동작

- 카드: 흰 배경(`surface-primary`), 1px `border-secondary`(`#E1E2E5`) 테두리, 반경 `r4`(8px), 안쪽 여백 가로 14px(`padding-p7`)·세로 8px(`s4`), 요소 간격 10px(`s5`). 폭은 내용에 맞춰 70px, 높이는 89px(테두리 포함)이다.
- 더하기 원: 40px, 배경 `surface-secondary`(`#F5F5F5`), 안의 더하기(Medium 20px)와 아래 글자는 `text-quaternary`(`#BCBEC2`)다(repo에서 Figma `text-quinary`와 같은 값).
- 글자: `typography-body-3-regular`(14/21).

## 접근성

- Semantic element: native `<button type="button">`.
- Accessible name·label: 보이는 글자("추가")가 이름이다. 더하기 아이콘은 `aria-hidden`이다. 목록 안에서 무엇을 추가하는지 더 분명히 하려면 `label`(예: "멤버 추가")을 준다.
- Keyboard·focus: Tab·Enter·Space로 누르고 포커스는 버튼 바깥 2px `border-brand` 윤곽선이다.
- 색 대비(토큰 hex로 계산): 글자·더하기 `#BCBEC2` on `#FFFFFF`는 1.9:1로 일반 텍스트 AA(4.5:1)에 크게 못 미친다. 누르는 버튼의 글자라 비활성 예외가 아니다(Figma 값, 확인할 항목).

## Styling과 의존성

- Token: `bg-surface-primary`·`bg-surface-secondary`, `border-border-secondary`, `px-padding-p7`·`py-s4`·`gap-s5`, `rounded-r4`, `text-text-quaternary`, `typography-body-3-regular`. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Variant=add`→`AddMemberCard`, 글자 "추가"→`label`.
- Storybook state matrix: `Default`, `CustomLabel`(그리고 `MemberCard`의 `Variants`에서 나란히 보기).

## 확인할 항목

- 글자 대비 1.9:1(위 접근성 항목). 연한 회색은 비활성처럼 보이는 색이라 눌러도 되는 버튼이라는 점이 약하게 전달될 수 있다. 디자이너 확인이 필요하다.
- 눌림·호버 모양이 없다. 누르는 순간의 시각 피드백이 필요한지 디자이너 확인이 필요하다.

## 검증

단위 테스트(이름, 클릭, `label`, 클래스, `type`)와 Storybook 렌더로 치수와 색을 Figma 값과 대조했다: 카드 70×89, 테두리 1px `#E1E2E5`, 반경 8px, 더하기 원 40px(x 15, y 9, `#F5F5F5`), 글자 14/21 `#BCBEC2`(y 59). 글자 픽셀은 Pretendard가 없어 비교하지 않았다. 스크린 리더, 실기기 터치, 키보드 포커스 윤곽선의 실제 모양은 확인하지 않았다.
