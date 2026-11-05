# 페이지: 알림 설정

## 메타데이터

- Route: `/my/notifications`(`app/(app)/my/notifications/page.tsx`, 하단 탭 없음)
- Status: UI 구현됨(Figma 값과 측정으로 대조함. 알림 설정 API·기기 권한 bridge 연결 전, 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 알림 설정(node `4096:75318`·`4096:75334`·`4096:75350`·`4096:75367`), 화면 설계서 `MY(3)`(node `4164:82271`)
- 이슈: #221

## 목적과 범위

### 포함

- 「앱 푸시 알림」 전체 토글과 「받을 알림」 다섯 종류(번들 소식, 뭉치 성장, 멤버 및 권한 소식, 팔로우, 좋아요 및 댓글) 토글. 바꾸면 바로 화면에 반영한다(설계서 2·3번).
- 전체를 끄면 종류별 토글은 값을 그대로 보여 주며 막고, 다시 켜면 그 값으로 돌아온다(2-1번). 종류 하나를 끄면 그 종류만 바뀐다(3-1번).
- 기기 알림 권한이 꺼져 있으면 헤더 아래 배너 「알림 설정이 꺼져 있어요.」를 띄우고 전체 토글까지 모두 값 그대로 막는다(4번). 배너의 「설정으로 이동」은 `onOpenDeviceSettings`가 있을 때만 그린다.

### 범위 외

- 알림 설정 조회·저장 API. 계약에 없어 page가 예시 값(`notificationSettingsFixture`, 모두 켜짐)을 넘기고 바꾼 값은 화면 상태로만 둔다. 연결할 때 저장 실패 시 되돌릴지 정한다.
- 기기 알림 권한 조회, 설정 화면 열기, 앱 복귀 시 다시 확인(4번). bridge가 없어 page는 권한을 `granted`로 고정하고 `onOpenDeviceSettings`를 넘기지 않는다.

## Route와 접근

- Path·params·search: `/my/notifications`, 없음. 입구는 MY 메뉴 「알림 설정」(`MY_PATHS.notifications`).
- 접근 권한·guard: `(app)` 그룹 기준을 따른다. 추가한 guard는 없다.
- Layout·navigation: `(main)` 밖이라 하단 탭이 없다. page가 전환 경계(`data-ssgoi-transition="/my/notifications"`)를 두고 MY와 프로필 수정과 같은 미는 slide(`menuSubSlide`)로 오간다. 뒤로 가기는 `useBackOr(MY_PATHS.home)`.

## 상태와 흐름

- 초기 진입: 넘겨받은 설정값으로 토글을 채운다.
- 전체 OFF: 종류별 토글 비활성, 값 유지.
- 기기 권한 OFF: 배너, 모든 토글 비활성, 값 유지.
- `settings`는 처음 값으로만 쓴다. API를 연결해 서버 값이 바뀔 수 있게 되면 동기화 방법(`key`로 다시 그리기 또는 query 상태로 올리기)을 정한다. 권한이 다시 켜지면(prop이 바뀌면) 배너가 사라지고 화면 상태 그대로 돌아온다.

## 데이터 의존성

- Query·mutation: 없음. 화면은 `settings`(`push`, `types`), `devicePermission`(`granted`·`denied`), `onOpenDeviceSettings?`를 prop으로 받는다.

## UI와 접근성

| Figma                      | 값                                         | 사용한 컴포넌트·토큰                                           |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| 헤더                       | 뒤로 가기만(#bcbec2)                       | `Header` + `HeaderIconButton`(subtle)                          |
| 헤더(또는 배너) 아래       | 12, 좌우 16                                | `pt-padding-p6`, `px-padding-p8`                               |
| 토글 행                    | Toggle_List                                | `ToggleListItem`                                               |
| 전체 토글과 받을 알림 사이 | 32                                         | `gap-s14`                                                      |
| 「받을 알림」              | Caption-1-Medium `text-tertiary`, 좌우 6   | `typography-caption-1-medium text-text-tertiary px-padding-p3` |
| 라벨과 목록, 행 사이       | 6, 4                                       | `gap-s3`, `gap-s2`                                             |
| 배너(Page Banner 02)       | `surface-secondary`, 16·12, 간격 8         | `bg-surface-secondary px-s8 py-s6 gap-s4`                      |
| 배너 아이콘                | `Line/Icon-M/bell-03`(사선 그은 종) 20px   | feature 안 inline SVG(BUNCH 아이콘 세트에 없음)                |
| 배너 문구·버튼             | Body-3-Regular `text-secondary`, 밑줄 버튼 | `typography-body-3-regular text-text-secondary`, `underline`   |

- 숨긴 `h1` 「알림 설정」. 「받을 알림」은 `h2`이고 목록 `section`의 이름이다. 각 토글은 `role="switch"`이며 행 제목이 이름, 설명이 `aria-describedby`다(`ToggleListItem`).
- 기기 권한이 꺼지면 모든 토글이 배너 문구를 설명(`aria-describedby`)으로 함께 읽어, 토글로 바로 이동해도 막힌 이유를 듣는다.
- 배너는 들어올 때부터 보이는 상태 안내라 live region을 두지 않았다. 아이콘은 장식(`aria-hidden`). 「설정으로 이동」은 글자 높이(21)대로 보이고 터치 영역만 배너 높이만큼 넓혔다.

## 검증

- [x] direct URL·MY 메뉴 진입: 개발 서버에서 `/my/notifications` 직접 열기, MY 「알림 설정」 눌러 이동(하단 탭 없음)
- [ ] 권한·redirect: 이 화면이 바꾸지 않아 확인하지 않음
- [x] 상태별 UI: 초기값, 종류 하나 끄기, 전체 OFF·복원, 기기 권한 OFF 배너(테스트, 브라우저)
- [x] 관련 test
- [x] 실행 command와 결과

실행한 검증: `vitest run src/features/my src/app/(app)`(93개 통과), web `typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`. 개발 서버에서 헤더 아래 12, 행 높이 54, 전체와 「받을 알림」 사이 32, 라벨 아래 6, 행 간격 4, 배너 높이 45와 그 아래 12, 배너 색을 Figma와 대조했다. 배너는 page 값을 잠시 `denied`로 바꿔 확인하고 되돌렸다. 스크린 리더와 실기기는 확인하지 않았다.

## 확인할 항목

- 비활성 행 흐림 (디자이너 확인): 화면 Figma(2-1·4번)는 행 글자를 진하게 두고 토글만 비활성으로 그렸지만, `ToggleListItem`은 Figma `Toggle_List` Disabled 변형대로 행 전체를 40%로 흐린다. 컴포넌트 기준을 따랐다.
- 전체 OFF로 막힌 이유 (문구 확인): 종류별 토글은 「사용할 수 없음」으로만 읽힌다. 바로 위 전체 토글 상태로 알 수 있지만, 보조기기용 안내(예: 「앱 푸시가 꺼져 있어 바꿀 수 없어요」)를 둘지는 문구를 정한 뒤 붙인다.
- 토글 전환 시간 (디자이너 확인): 설계서는 Dissolve·Ease out·200ms, 디자인 시스템 `Toggle`은 노브 이동 150ms ease-out이다. 컴포넌트 값을 그대로 쓴다.
- 2-1번 전체 토글 모양: 설계서 2-1 화면은 전체 토글이 흐린 모양으로 그려져 있으나 설명상 전체 토글은 계속 누를 수 있어 일반 OFF로 구현했다.
- 화면 전환 (제안): 설계서에 정의가 없어 MY → 프로필 수정과 같은 미는 slide를 썼다.
- 「설정으로 이동」과 앱 복귀 시 권한 재확인은 bridge 연결 때 붙인다(별도 이슈).
