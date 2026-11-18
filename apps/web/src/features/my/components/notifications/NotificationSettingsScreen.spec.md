# 페이지: 알림 설정

## 메타데이터

- Route: `/my/notifications`(`app/(app)/my/notifications/page.tsx`, 하단 탭 없음)
- Status: UI 구현됨(Figma 값과 측정으로 대조함. 알림 설정 API·기기 권한 읽기 연결됨(#332), 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 알림 설정(node `4096:75318`·`4096:75334`·`4096:75350`·`4096:75367`), 화면 설계서 `MY(3)`(node `4164:82271`)
- 이슈: #221, #332(알림 설정 API·기기 알림 권한 연결)

## 목적과 범위

### 포함

- 「앱 푸시 알림」 전체 토글과 「받을 알림」 네 종류(번들 소식, 멤버 및 권한 소식, 팔로우, 좋아요 및 댓글) 토글. 바꾸면 바로 화면에 반영하고 서버에 저장한다(설계서 2·3번).
- 전체를 끄면 종류별 토글은 값을 그대로 보여 주며 막고, 다시 켜면 그 값으로 돌아온다(2-1번). 종류 하나를 끄면 그 종류만 바뀐다(3-1번). 네 종류를 모두 꺼도 전체 토글은 켜진 채로 둔다(기능명세서 1110판 7.3.3 상세 3).
- 기기 알림 권한이 꺼져 있으면 헤더 아래 배너 「알림 설정이 꺼져 있어요.」를 띄우고 전체 토글까지 모두 값 그대로 막는다(4번). 배너의 「설정으로 이동」은 `onOpenDeviceSettings`가 있을 때만 그린다.

### 범위 외

- 푸시 기기 등록·해제(토큰)와 로그아웃 때의 해제. 알림 설정 화면과 흐름이 달라 별도 이슈로 한다.
- 가입 직후 기기 권한으로 모든 토글의 초기값을 정하는 일(기능명세서 7.3.1 로직 3). 서버 기본값은 모두 켜짐이라 가입 흐름에서 정한다.

## Route와 접근

- Path·params·search: `/my/notifications`, 없음. 입구는 MY 메뉴 「알림 설정」(`MY_PATHS.notifications`).
- 접근 권한·guard: `(app)` 그룹 기준을 따른다. 추가한 guard는 없다.
- Layout·navigation: `(main)` 밖이라 하단 탭이 없다. page가 전환 경계(`data-ssgoi-transition="/my/notifications"`)를 두고 MY와 프로필 수정과 같은 미는 slide(`menuSubSlide`)로 오간다. 뒤로 가기는 `useBackOr(MY_PATHS.home)`.

## 상태와 흐름

- 초기 진입: `NotificationSettingsRoute`가 서버 설정(`GET /members/me/push-preferences`)을 받아 토글을 채운다. 받는 동안 `PageLoading`과 스크린 리더 안내를 보이고, 받지 못하면 이전 화면으로 돌아가 그 화면에서 오류 토스트를 보인다(`toastAfterNavigation`, 7.3.1 예외).
- 토글 저장: 누르면 바로 화면을 바꾸고(optimistic) `PATCH`로 저장한다. 같은 `scope`로 순서대로 보내 연타해도 서버에 마지막 값이 남고, 실패하면 저장 전 값으로 되돌리고 오류 토스트를 띄운 뒤 서버 값을 다시 받는다(7.3.2·7.3.3 예외).
- 전체 OFF: 종류별 토글 비활성, 값 유지.
- 기기 권한 OFF: 배너, 모든 토글 비활성, 값 유지.
- 화면은 `settings`를 prop으로만 그리고 저장은 `onChangePush`·`onChangeType`으로 알린다(상태를 들고 있지 않음). 권한이 다시 켜지면(prop이 바뀌면) 배너가 사라지고 받은 값 그대로 돌아온다.
- 기기 알림 권한은 `useDeviceNotificationPermission`이 쉘 bridge `getPermissionStatus('notification')`로 상태만 읽는다(OS 권한 창을 띄우지 않음). 화면에 들어올 때와 앱으로 돌아올 때(탭이 다시 보이거나 창이 포커스를 받을 때) 다시 읽는다. `denied`만 꺼짐으로 보고, 브라우저·오래된 쉘·읽기 실패·`undetermined`는 켜짐으로 둔다. 「설정으로 이동」은 쉘에서만 `openAppSettings`로 연다(7.3.4). 쉘에서 첫 상태를 받기 전(최대 1초, `CHECK_CAP_MS`)에는 꺼져 있는지 아직 모르므로 배너 없이 토글만 잠가 거부된 기기에서 설정이 바뀌지 않게 한다(`devicePermissionChecking`). 상한이 지나거나 읽지 못하면(읽기를 지원하지 않는 오래된 쉘 등) 켜짐으로 풀리고, 상한 뒤에 꺼짐으로 확인되면 그때 배너와 비활성으로 바뀐다. 오래된 쉘은 들어올 때마다 최대 1초 잠긴다.

## 데이터 의존성

- Query: `notificationSettingsQueryOptions`(key `myKeys.notificationSettings()`, `GET /members/me/push-preferences`). Mutation: `useUpdateNotificationSettingsMutation`(`PATCH`, `scope`로 직렬화, optimistic 후 실패 되돌림, 다른 요청이 남아 있으면 응답으로 덮어쓰지 않음).
- 서버 `categories` 21개 키(화면 계층에서는 `types`로 변환)와 화면 토글 4개의 대응은 `lib/notificationPreferences.ts`(`NOTIFICATION_TYPE_KEYS`)가 맡는다. 묶인 알림이 모두 켜져 있을 때만 그 토글을 켜짐으로 보이고, 토글을 누르면 묶인 키를 모두 같은 값으로 보낸다. 뭉치 성장(9)·내보내짐(14)·번치 삭제(15)·공개 범위 바뀜(16)은 어느 토글에도 묶지 않아 보내지 않는다.
- 화면(`NotificationSettingsScreen`)은 `settings`, `devicePermission`, `onChangePush`, `onChangeType`, `onOpenDeviceSettings?`를 prop으로 받는다.

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
- 1110판 자동 OFF 제거 (반영, #332): 받을 알림 4개를 모두 꺼도 앱 푸시는 켜진 채로 둔다. 자동 OFF·낭독 문구·초점 이동을 뺐다.
- 뭉치 성장(9번, `CHARACTER_GROWN`) (확인됨): 뭉치 알림이 기획에서 제외돼 어느 토글에도 묶지 않고 요청에도 보내지 않는다(5.12.3 9번 삭제, `BunchNotificationsScreen.spec.md`와 같음).
- 묶음 안 알림이 섞여 있을 때 (제안): 서버 값이 묶음 안에서 서로 다르면(다른 기기·이후 세분화) 그 토글은 꺼짐으로 보인다. 누르면 묶인 키가 모두 켜진다.
- 기기 권한 읽기 (실기기 확인 필요): 쉘의 `getPermissionStatus`(`Notifications.getPermissionsAsync`)와 설정에서 돌아온 뒤 재확인을 실기기에서 확인하지 못했다. 쉘이 bridge 메서드 목록을 알려 주기 전에는 0.3초 간격으로 최대 10번 다시 확인한다.
- 낭독 안내 (반영, #332): 설정값을 받는 동안 「알림 설정을 불러오는 중이에요」(영역을 먼저 마운트하고 문구를 나중에 채움), 화면에 머무는 중 기기 알림 권한이 바뀌면 「기기 알림이 꺼져 있어 …」·「기기 알림이 켜져서 …」를 `role="status"`로 알린다. 처음 값은 알리지 않는다. 같은 로딩 안내 방식이 `MyRoute`·`ProfileEditRoute`에는 아직 없다(영역과 문구가 함께 생김).
- 알려진 차이 (#332): 앱 푸시 OFF로 막힌 종류 토글은 이유가 `aria-describedby`로 전달되지 않는다(기기 권한 OFF만 배너로 전달). 권한이 바뀌어 토글이 비활성이 될 때 초점이 있던 토글의 초점이 사라질 수 있다. 저장 실패 토스트는 어느 토글이 되돌아갔는지 말하지 않는다. 토스트 낭독과 되돌림 낭독은 VoiceOver·TalkBack에서 확인하지 못했다.
- 로그아웃 뒤 캐시 (알려진 차이): 알림 설정 query는 persist 대상이 아니라 같은 탭에서 계정을 바꾸면 이전 계정 값이 잠깐 보일 수 있다. 화면 진입마다 다시 받아(`refetchOnMount`) 완화하며, 로그아웃이 문서를 새로 열어 캐시를 비우는 기존 동작을 따른다.
- 토글 없는 푸시: 내보내짐(14번)·번치 삭제(15번)·공개 범위 바뀜(16번)은 앱 푸시가 켜져 있으면 항상 보낸다(7.3.2 로직 4). 화면에는 줄을 두지 않는다.
