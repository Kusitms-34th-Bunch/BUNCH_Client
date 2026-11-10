# 페이지: 초대 진입(보관된 초대 확인)

## 메타데이터

- Route: `/onboarding/join/enter`(`apps/web/src/app/(app)/onboarding/join/enter/page.tsx`)
- Status: 구현됨(이슈 #312). 화면 없이 확인하는 동안 `PageLoading`만 보이고 결과에 따라 이동한다. 실서버·실기기 검증 전
- 디자인 출처: 없음(로딩만 보이는 이동용 화면). 기능명세 2.7.2, 1.2.8, 1.4.7, 1.5.1

## 목적과 범위

### 포함

- 초대 링크로 들어와 로그인·가입을 마친 사용자(또는 이미 로그인한 사용자)의 보관된 초대를 서버에 확인하고 초대 확인 화면으로 이어 준다.
- 로그인·가입이 끝난 가입 완료 사용자의 도착지가 보관된 초대가 있으면 이 화면이다(`resolvePostLoginPath`의 `hasPendingInvitation`).

### 범위 외

- 링크 진입 페이지(`features/invite-entry`의 `InviteEntry.spec.md`)와 유니버셜 링크.
- 링크를 직접 입력하는 참여(`BunchJoin.spec.md`).

## Route와 접근

- 접근: 로그인한 가입 완료 사용자만 머문다. 비로그인은 로그인으로, 가입 중은 약관·프로필로 접근 가드가 보낸다.
- 보관된 초대가 없으면(직접 주소 입력·이미 처리됨) 확인하지 않고 번치 시작(`/onboarding`)으로 `replace`한다.
- `join` layout의 `JoinInvitationProvider` 안이라 확인한 초대를 초대 확인 화면과 공유한다.

## 상태와 흐름

- 확인 요청(`POST /invitations/verify`)은 개발 모드의 effect 이중 실행에도 한 번만 보낸다. 확인 중에는 숨김 제목 「초대장 확인」(화면 이동 때 초점이 갈 곳)과 `role="status"` 「초대를 확인하는 중이에요」, `PageLoading`.
- 결과별 이동(모두 `router.replace`):
  - `AVAILABLE`, `LIMIT_EXCEEDED`: 확인한 초대(입력과 카드)를 흐름 상태에 남기고 초대 확인 화면으로. 소속이 10개여도 카드는 보여 주고 「참여하기」에서 막는다(기능명세 2.7.2). 보관한 초대는 유지(초대 확인 화면이 참여·포기·실패 때 지움).
  - `ALREADY_MEMBER`: 토스트 「이미 참여 중인 번치예요.」, 보관한 초대 삭제, 번치(임시 피드 `/`)로.
  - `FULL`: 토스트 「최대 인원을 초과한 번치입니다.」, 삭제, 번치 시작으로.
  - 404 `INVITE_001`: 토스트 「유효하지 않은 링크입니다.」, 삭제, 번치 시작으로.
  - 그 밖(네트워크·서버·429): 토스트 「일시적인 오류가 발생했어요. 다시 시도해 주세요」, **보관한 초대는 유지**, 번치 시작으로(기능명세 2.6.1의 일시적 오류).

## 데이터 의존성

- Mutation: `useVerifyInvitationMutation`(`POST /invitations/verify`, 초대 참여 연동과 같은 훅). 요청 결과는 `mutateAsync`로 받아 화면이 바뀌어도 이동이 이어지게 한다.
- 보관소: `shared/lib/pendingInvitation.ts`.

## UI와 접근성

- 보이는 것은 `PageLoading`(화면 dim + 물결 점 패턴, 앱 공통 로딩)뿐이다. 상태는 항상 마운트된 `role="status"`로 알리고, `h1`은 `RouteFocus`가 초점을 옮길 곳이다.

## 검증

- [x] 관련 test: `BunchJoinEntry.test.tsx`(확인 중 안내, AVAILABLE·LIMIT_EXCEEDED, 요청 한 번, ALREADY_MEMBER, FULL, INVITE_001, 일시 오류, 보관된 초대 없음), `shared/lib/pendingInvitation.test.ts`, `features/auth/lib/postLoginPath.test.ts`·`accessPolicy.test.ts`(보관된 초대가 있을 때의 도착지)
- [ ] 로그인 → 가입 → 이 화면 → 초대 확인의 실제 흐름(앱 쉘 소셜 로그인 포함): 하지 못함
- [ ] 실서버: 하지 못함

## 확인할 항목

- 일시적 오류 뒤 이동 (제안): 번치 시작으로 보내고 초대는 보관해, 다음에 로그인할 때 다시 시도한다. 그 자리에서 다시 시도하는 화면이 필요하면 기획 확인이 필요하다.
- 도착지 (임시): 이미 참여 중인 번치로 가는 경로가 번치 홈이 아니라 임시 피드(`/`)다(`BunchJoined`와 같은 기존 임시 경로).
