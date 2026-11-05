# 컴포넌트: PhotoUploadSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 01 `2487:46357`, 기능명세 `docs/specs/photo-box.md` 3.2.1

## 목적과 범위

- 사진함 「+」로 여는 사진 올리기 방식 선택 시트. 제목과 「앨범에서 선택」·「카메라로 찍기」 카드.
- 앨범·카메라 실행, 권한 요청, 1,000장 제한 안내는 사진함 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `title`: 예 `퇴근런클럽에 사진 올리기`. 번치 이름을 넣은 문장은 호출자가 만든다.
- `onSelectAlbum()`, `onTakePhoto()`: 카드를 누르면 호출. 시트는 스스로 닫지 않는다.
- 카드 문구는 Figma 고정 문구라 컴포넌트가 가진다.

## 상태와 동작

- 바깥 터치·끌기·ESC·숨긴 닫기 버튼으로 닫는다.
- 호출자는 카드 콜백에서 먼저 `open`을 `false`로 바꾼 뒤 앨범·카메라를 연다. 연타로 콜백이 두 번 불리는 것도 호출자가 막는다.

## 접근성

- 제목이 시트 이름. 카드는 버튼(제목이 이름, 설명이 설명).
- 화면에 닫기 버튼이 없어 키보드 초점 때만 보이는 닫기 버튼을 둔다(첫 초점 위치).

## Styling과 의존성

- `BottomSheet`, `UploadOptionCard`(`icon="camera"`).
- Figma 01 간격: 손잡이 아래 14(`pt-padding-p7`, Content `gap-0`), 제목 18/27(`typography-heading-2-semibold`), 제목·카드 10(`mt-s5`), 카드 사이 6(`gap-s3`), 카드 아래 20(`pb-s10`).

## 확인할 항목

- 카드 설명 글자 (제안): Figma 01은 13/18·`#777`, `UploadOptionCard`는 14/21·`text-tertiary`. 카드 기준을 유지했다.
- 카드 아래 여백 (제안): Figma 프레임이 고정 높이(277)라 20px로 정했다.

## 검증

- [x] test 3개: 시트 이름·두 카드, 콜백·자동으로 닫지 않음, 숨긴 닫기 버튼
- [x] Story: Default, LongTitle
- [x] Storybook: 제목·카드 10px, 카드 사이 6px, 카드 82px, 숨긴 닫기 버튼 초점 시 40×40
