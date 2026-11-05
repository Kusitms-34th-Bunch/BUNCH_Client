# 컴포넌트: MoreMenuSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 06 `2487:46356`

## 목적과 범위

- 「⋯」로 여는 메뉴 시트. `MenuLabel` 목록과 「취소하기」.
- 항목별 동작(차단, 신고 시트 열기 등)은 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `items`: `id`, `label`, `onSelect` 목록. 항목을 눌러도 시트는 닫지 않는다.
- `title?`: 화면에 보이지 않는 시트 이름. 기본값 `더보기`.

## 상태와 동작

- 「취소하기」, 바깥 터치, 끌기, ESC로 닫는다.
- 다른 시트·화면을 열 때는 호출자가 먼저 닫는다.

## 접근성

- 숨긴 제목이 시트 이름. 「취소하기」가 화면에 보이는 닫는 수단이다.

## Styling과 의존성

- `MenuLabel`, `Button variant="secondary"`. 항목 사이 8(`gap-s4`).

## 확인할 항목

- 위험 동작 표시 (미정): 「차단하기」를 경고 색으로 구분할지 Figma에 없다.

## 검증

- [x] test 2개: 숨긴 제목·항목 콜백, 「취소하기」 닫기 요청
- [x] Story: Default
