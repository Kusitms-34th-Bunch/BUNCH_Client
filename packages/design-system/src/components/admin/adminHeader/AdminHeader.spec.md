# 컴포넌트: AdminHeader

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #592)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Header`(node `7782:47421`). 화면설계서에서는 상세 패널 위쪽 제목줄이다.
- 이름: `core`의 `Header`와 이름이 겹친다. core는 높이 48px·좌우 16px·제목 18px의 모바일 상단 바이고, 어드민은 좌우 32px·위아래 20px·제목 22px에 코드·배지가 있다. 규격이 달라 `Admin` 접두사를 붙였다(2026-11-27 규칙).

## 목적과 범위

### 제공하는 동작

- 상세 패널 제목줄: 뒤로 가기(선택), 제목, 식별 코드(선택), 상태 배지(선택), 닫기(선택).

### 제공하지 않는 동작

- 패널 열고 닫기, 이동은 하지 않는다. 버튼을 누르면 콜백만 부른다.
- 배지 모양은 정하지 않는다. 호출자가 `ColorBadge` 등으로 넘긴다.

## Public API

- Props: `title`(필수), `code`, `badge`, `back`·`close`(`{ onClick, label }`, 없으면 숨김), `titleAs`(`h2` 기본 | `h1` | `h3`), native `<header>` 속성.
- 호출자 소유 책임: 제목·코드 문구, 배지, 버튼 이름 문구, 누르면 할 일.

## 상태와 동작

- 제목 `title-1-semi-bold` `text-primary`, 코드 `body-3-regular` `text-quaternary`.
- 뒤로 가기 아이콘 24px `icon-tertiary`, 닫기 아이콘 24px `icon-primary`. core `IconButton`(plain)으로 그린다.
- 긴 제목: 한 줄 말줄임. 코드·배지·닫기는 줄지 않는다. 잘린 전체 제목을 화면에서 볼 방법은 없다(스크린 리더는 전체를 읽음).

## 접근성

- Semantic element: `<header>`, 제목은 heading(`h2` 기본). 상세 패널(`aside`·`section` 등) 안에서는 `<header>`가 banner landmark가 아니다. 패널의 이름은 패널 컨테이너가 정한다.
- 아이콘 버튼은 `label`이 접근성 이름이다(필수).
- 누름 영역: 아이콘 24px에 사방 8px(`before:-inset-2`)을 더해 40px이다.

## Styling과 의존성

| Figma 값                                         | 토큰·클래스                                      |
| ------------------------------------------------ | ------------------------------------------------ |
| 좌우 `padding-p16`(32), 위아래 `padding-p10`(20) | `px-padding-p16 py-padding-p10`                  |
| 아이콘·제목 묶음 간격 `spacing-s5`(10)           | `gap-s5`                                         |
| 제목 묶음·배지 간격 `spacing-s7`(14)             | `gap-s7`                                         |
| 제목·코드 간격 `spacing-s3`(6)                   | `gap-s3`                                         |
| 제목 `Title-1-Semi Bold` 22/28 `text-primary`    | `typography-title-1-semi-bold text-text-primary` |
| 코드 `Body-3-Regular` 14/21 `text-quaternary`    | `typography-body-3-regular text-text-quaternary` |
| 아이콘 chevron-left #535A61, close #121212       | `text-icon-tertiary`, `text-icon-primary`        |

- 허용되는 dependency: core `IconButton`, 아이콘 생성물.
- Storybook state matrix: `Default`, `CloseOnly`, `TitleOnly`, `LongTitle`.

## 확인할 항목

- 아이콘 버튼 눌림 모양 (제안): Figma에 Hover·Pressed 모양이 없다. core `IconButton` plain의 기본 눌림(뒤 배경 덮개)을 그대로 쓴다.
- 제목 heading 단계 (제안): 상세 패널 안 제목이라 `h2`를 기본으로 두고 `titleAs`로 바꾼다.

## 검증

- [x] 사용자 관찰 동작 test(heading, 버튼 이름·콜백, 숨김)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
