# 컴포넌트: AdminTransferSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: Bottom Sheet 05 `2487:46352`

## 목적과 범위

- 관리자가 번치를 나가기 전에 다른 멤버를 관리자로 지정하는 확인 시트.
- 지정·나가기 요청과 이후 이동은 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `memberName`: 제목 「{이름}님을 관리자로 지정하고 나갈까요?」와 부제 「{이름}님이 번치 관리와 번들 발행 권한을 갖게 돼요.」에 쓴다.
- `onConfirm()`: 「지정하고 나가기」. 닫기는 호출자 담당. `confirming?`: 처리 중 비활성.
- `illustration?`: 제목 위 92px 그림.

## 상태와 동작

- 「취소」는 닫기 요청(`onOpenChange(false)`). 바깥 터치·끌기·ESC로도 닫힌다.
- 안내 상자 문구는 Figma 고정 문구.

## 접근성

- 제목이 시트 이름, 부제가 설명. 그림은 장식으로 다룬다(호출자가 `alt=""`).

## Styling과 의존성

- 가운데 정렬. 손잡이 아래 40(기본 16 + `mt-s12`), 그림·제목 20(`gap-s10`), 제목·부제 2(`gap-s1`), 부제·안내 상자 32(`gap-s14`), 안내 상자·버튼 30(기본 16 + `Footer` 14).
- 제목 `typography-heading-2-medium`(Figma Heading-2-Medium 18/500/27), 부제 `typography-caption-1-regular text-tertiary`, 안내 상자 `surface-secondary`·`typography-body-3-regular`(Figma Body-3-Regular 14/21과 같은 값).
- 버튼 가로 2개(`Footer className="flex-row"`): `tertiary` 「취소」, `primary` 「지정하고 나가기」.

## 확인할 항목

- 그림 (미정): Figma가 회색 자리표시(`illust`)라 에셋을 받으면 호출자가 넣는다.
- 「취소」 글자색 (제안): Figma는 `text-tertiary`, `Button tertiary`는 `text-primary`. 기존 버튼 변형을 유지했다.

## 검증

- [x] test 3개: 이름으로 제목·부제, 취소·확인 동작 분리, 처리 중 비활성
- [x] Story: Default, WithoutIllustration, Confirming
- [x] Storybook: 손잡이·그림 40, 그림 92, 그림·제목 20, 제목·부제 2, 부제·상자 32, 상자·버튼 30
