# 컴포넌트: BunchSwitchSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: Bottom Sheet 04 `2487:46353`

## 목적과 범위

- 다른 번치로 전환하는 시트. 「번치 전환하기」 제목·닫기, 번치 목록, 「새로운 번치 추가하기」.
- 번치 목록 조회, 전환 후 이동, 번치 만들기 흐름은 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `bunches`: `id`, `name`, `imageSrc?`, `notificationCount?`, `status?`(`BunchListItem`과 같음).
- `onSelect(id)`: 고를 수 있는 번치를 누르면 호출. `onAdd()`: 추가 버튼.

## 상태와 동작

- `notificationCount`가 1 이상인 기본 번치에 분홍 「알림 N개」, `unavailable`에 회색 「접근 불가」를 표시한다.
- 현재 번치·접근 불가 번치는 흐림·선택 불가.
- 목록이 길면 본문만 스크롤한다.

## 접근성

- 제목이 시트 이름, 보이는 닫기 버튼. 현재 번치는 `aria-current`.

## Styling과 의존성

- `BunchListItem`, `ColorBadge`(md, pink·gray), `Button variant="tertiary"`(+ `LineAddIcon`).
- 제목·목록 24(기본 16 + `mt-s4`), 행 사이 6(`gap-s3`).

## 확인할 항목

- 「알림 N개」 문구 (제안): Figma 표기 그대로. 99개 초과 표기는 미정.
- 현재 번치 표시 (제안): `BunchListItem` spec 참고.

## 검증

- [x] test 3개: 알림·접근 불가 표시, 고를 수 있는 번치만 `onSelect`, 추가 버튼
- [x] Story: Default, ManyBunches
- [x] Storybook: 행 48px, 행 사이 6px, 제목·목록 24px, 이미지 36px
