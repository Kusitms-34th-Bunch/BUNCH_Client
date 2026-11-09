# 컴포넌트: BundleMembersSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: `5367:112757`, 기능명세 `docs/specs/feed.md` 6.3.2

## 목적과 범위

- 번들에 참여한 멤버 목록 시트. 「참여 멤버」, `ProfileListItem` 줄, 「취소」.
- 나간 멤버의 이름·이미지 대체, 닫은 뒤 이동은 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `members`: `name`, `imageSrc?`, `memberRole?`, `roleLabel?`, `renderLink?` 목록. `renderLink`가 없으면 누를 수 없다. 닫기와 이동은 호출자 담당이다.

## 상태와 동작

- 링크는 `renderLink`로 호출자가 그린다(`MenuLabel`과 같은 방식). 앱의 라우터 링크를 그대로 쓴다.

## 접근성

- 제목이 시트 이름, 누를 수 있는 줄은 링크다. 링크 이름은 역할 배지와 이름 순서로 읽힌다.

## Styling과 의존성

- 줄 사이 8(`gap-s4`), 줄은 `ProfileListItem` 그대로.

## 검증

- [x] test: 링크와 누를 수 없는 줄, 역할 배지
- [x] Story: Default, ManyMembers
