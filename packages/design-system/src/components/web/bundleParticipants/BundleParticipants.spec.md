# 컴포넌트: BundleParticipants

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Bundle Author Info`(node `4137:109682`)와 `Bundle Engagement`(node `3982:72803`)의 참여자 묶음
- 기능 명세: `docs/specs/feed.md` 6.1.3·6.3.2
- 이슈: #253

## 목적과 범위

- 번들 참여 멤버의 얼굴 3개(24px, 4px씩 겹침, 앞 얼굴이 위)와 넘는 인원 「외 N명」. 누르면 참여 멤버 시트를 여는 버튼이다.
- 멤버가 0명이면 그리지 않는다. 시트와 나간·탈퇴 멤버 표시는 호출자가 한다.

## Public API

- Props: `members`(`{ name, imageSrc? }[]`, 필수), `label`(기본 「참여 멤버 N명」), native `<button>` 속성.
- 타입 `BundleParticipant`를 내보낸다.

## 접근성

- 이름은 「참여 멤버 7명, 외 4명」으로 전체 인원과 보이는 글자를 함께 전한다(음성 제어로 「외 4명」을 불러도 찾음).
- `onClick`이 없으면 버튼이 아니라 같은 이름의 이미지(`role="img"`)로 그린다.
- 누르는 영역은 위아래 8px 넓혀 40px.

## Styling과 의존성

- `ProfileImage size="XXS"` + `outline-border-tertiary` 1px, 「외 N명」 Body-4-Regular 13/18 `text-tertiary`, 얼굴과 간격 4(`gap-s2`).
- Storybook: `Default`(7명), `ThreeOrLess`.

## 확인할 항목

- 없음. 명세와 Figma가 달라(최대 8개·+N 없음 vs 3개+「외 N명」) 화면은 Figma를 따르기로 정하고 명세를 고쳤다.

## 검증

- 단위 테스트: 이름과 「외 N명」, 3명 이하·0명 처리, 누름 알림.
