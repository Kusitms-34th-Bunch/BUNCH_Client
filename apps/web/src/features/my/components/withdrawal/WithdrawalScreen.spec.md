# 페이지: 회원 탈퇴 안내

## 메타데이터

- Route: `/my/withdrawal`(`app/(app)/my/withdrawal/page.tsx`, 하단 탭 없음)
- Status: 구현됨(Figma 값과 대조함). 탈퇴·탈퇴 확인 API 연결됨(#404), 실서버·실기기 검증 전
- 디자인 출처: Figma `BUNCH - 작업파일`의 탈퇴하기(1)~(3)(node `4096:75383`·`4096:75422`·`4096:75500`), 권한 이전 안내(5)(node `4096:75541`), 화면 설계서 `MY(5)`(node `4164:87384`)
- 이슈: #238, #404(API 연결)

## 목적과 범위

### 포함

- 「탈퇴하기 전에 확인해 주세요」 안내, 「삭제되는 정보」 다섯 항목과 「남는 기록」 한 항목(설계서 1·2번).
- 「안내 사항을 모두 확인했어요.」 체크. 체크 전·해제 시 「다음」 비활성, 체크하면 활성(2-1번).
- 「다음」: 누를 때마다 넘겨야 할 번치를 서버에서 새로 확인한다. 없으면 최종 확인 창, 있으면 권한 이전 안내 창(2-2번). 확인하는 동안 「다음」은 `aria-busy`이고 다시 눌러도 보내지 않으며(초점 유지), 「넘길 번치를 확인하는 중이에요」를 낭독한다. 확인에 실패하면 창 없이 오류 토스트(7.6.2 예외). 확인 중 화면을 떠나면 결과로 창을 열지 않는다.
- 최종 확인 창 「정말 탈퇴하시겠어요?」 / 「계정이 영구 삭제되며, 복구할 수 없어요.」 / 취소·탈퇴하기(3번). 취소면 창만 닫고 안내 화면과 체크를 그대로 둔다.
- Apple 가입자(탈퇴 확인 응답 `provider: APPLE`, #479): 「탈퇴하기」를 누르면 앱 쉘의 Apple 로그인 창으로 재인증하고, 받은 일회용 인증 코드를 `appleAuthorizationCode`로 함께 보내 서버가 Apple 연결을 먼저 끊는다(App Store 지침 5.1.1(v)). 창을 닫으면 탈퇴하지 않고 확인 창만 닫는다. 연결 해제 실패(503 `USER_007`)·코드 누락(400 `USER_006`)·브라우저·`authorizeApple`이 없는 이전 쉘은 탈퇴하지 않고 일반 실패 토스트이며, 다시 누르면 새 코드로 다시 시도한다(코드는 일회용). Android 쉘은 Apple 로그인 창이 없어 Apple 가입자가 탈퇴할 수 없고 일반 실패 안내만 보인다(안내 문구는 기획 확인 필요).
- 권한 이전 안내 창 「관리자로 있는 번치가 있어요」 / 「번치의 관리자 권한을 다른 멤버에게 넘긴 뒤 탈퇴할 수 있어요.」 / 권한 넘기러 가기·취소(4번 진입). 「권한 넘기러 가기」는 `/my/withdrawal/transfer`로 이동한다.

### 범위 외

- 관리자 권한 이전 화면(설계서 4·5번). `AdminTransferScreen.spec.md`에서 다룬다.
- 혼자 있는 번치 삭제, 코멘트·댓글 표시 처리, 모든 기기 로그인·푸시 해제. 서버가 탈퇴 처리에서 맡는다(기능명세서 7.6.4 로직 2).

## Route와 접근

- Path·params·search: `/my/withdrawal`, 없음. 입구는 MY 메뉴 「탈퇴하기」(`MY_PATHS.withdrawal`).
- 접근 권한·guard: `(app)` 그룹 기준을 따른다. 추가한 guard는 없다.
- Layout·navigation: `(main)` 밖이라 하단 탭이 없다. page가 전환 경계(`data-ssgoi-transition="/my/withdrawal"`)를 두고 MY와 다른 하위 화면과 같은 미는 slide(`pushSlide`)로 오간다. 뒤로 가기는 `useBackOr(MY_PATHS.home)`.

## 상태와 흐름

- 초기 진입: 체크 해제, 「다음」 비활성. 이 화면에서 체크하고 「권한 넘기러 가기」로 가서 넘기고 돌아오면 한 번만 체크를 유지해 「다음」이 활성이다(기능명세서 7.6.1 로직 1). 권한 이전 화면에 주소로 바로 들어와 넘기면 유지하지 않는다. 값은 첫 렌더에 읽고(`peekKeepAgreed`) effect에서 지운다(`clearKeepAgreed`).
- 「탈퇴하기」: 넘겨야 할 번치를 한 번 더 확인한다. 그사이 생겼으면 창이 다 닫힌 뒤 권한 이전 안내 창을 띄운다(7.6.4 로직 1). 확인에 실패하면 창이 다 닫힌 뒤 오류 토스트.
- 탈퇴 요청 중: 「탈퇴하기」를 막고 취소·ESC로 창을 닫지 않는다. 탈퇴(`POST /members/me/withdrawal`)가 성공하면 BFF 로그아웃으로 이 기기의 인증 쿠키를 지운다. 계정이 이미 없어 백엔드 폐기가 실패해도 BFF는 쿠키를 지우므로 그 실패는 탈퇴 실패로 보지 않는다. 그다음 `/login`을 `location.replace`로 새로 연다(메모리의 사용자 데이터를 비움). 이동은 mutation 정의의 `onSuccess`가 맡아 요청 중 화면이 사라져도 실행된다.
- 실패: 창을 닫고 「일시적인 오류가 발생했어요. 다시 시도해 주세요」 토스트(기능명세서 7.6.4, 공통 mutation 실패 처리). 체크는 그대로라 다시 시도할 수 있다.

## 데이터 의존성

- 넘겨야 할 번치: `ownedBunchesQueryOptions`(`queries/withdrawal.ts`, key `myKeys.ownedBunches()`, `staleTime` 0). `GET /members/me/withdrawal/check`의 메인 관리자 번치마다 `GET /bunches/{id}/memberships`를 받아 넘길 수 있는 멤버(나 제외, `canTransferOwner`)를 붙이고, 멤버가 없는 번치(나 혼자)는 뺀다. 「다음」과 「탈퇴하기」에서 `fetchQuery`로 새로 받는다.
- Mutation: `useWithdrawMutation`(`queries/withdrawal.ts`) → `withdraw`(`api/withdrawal.ts`). 성공하면 이 기기의 query 저장본을 지우고 로그인 화면을 새로 연다.
- 권한을 넘기고 돌아왔는지·탈퇴 안내에서 들어갔는지는 화면 흐름 표시(`lib/withdrawalFlow.ts`, 메모리)다.

## UI와 접근성

- Component mapping:

| Figma                  | 값                                                         | 사용한 컴포넌트·토큰                                                        |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| 헤더                   | 뒤로 가기(`#BCBEC2`)                                       | `Header` + `HeaderIconButton tone="subtle"`                                 |
| 제목·안내              | Title-1-SemiBold / Body-3-Regular, 위 12·좌우 16           | `PageHeader`                                                                |
| 제목과 묶음 사이       | 20                                                         | `gap-s10`                                                                   |
| 두 묶음 사이           | 18(구분선 위아래), 구분선 343                              | `gap-s9`, `hr`(`border-border-tertiary`)                                    |
| 묶음 제목              | Caption-1-Medium, 좌우 6, 빨강 `#DB3C19`·초록 `#00872E`    | `typography-caption-1-medium px-padding-p3`, primitive 색(아래 확인할 항목) |
| 제목과 항목, 항목 사이 | 6, 4                                                       | `gap-s3`, `gap-s2`                                                          |
| 항목                   | 위아래 4·좌우 8, Body-1-Medium / Body-4-Regular, 사이 4    | `px-padding-p4 py-padding-p2 gap-s2`                                        |
| 확인 줄                | 위아래 6·좌우 4, 체크 24, 사이 8, Body-3-Regular `#535A61` | `label` + `Checkbox`, `px-padding-p2 py-padding-p3 gap-s4`                  |
| 「다음」               | SolidButton 48, 확인 줄 아래 8                             | `Button`(primary), `gap-s4`                                                 |
| 최종 확인 창           | Dialog SolidButton(취소·탈퇴하기)                          | `ConfirmDialog`                                                             |
| 권한 이전 안내 창      | Dialog Profile (Stack), 취소가 회색 채운 버튼              | `ActionDialog` + `cancelAppearance="solid"`                                 |

- Semantic: 제목 `h1`(`PageHeader`), 묶음 제목 `h2`, 항목은 목록(`ul`·`li`).
- Keyboard·focus·accessible name: 체크박스 이름은 감싼 `label`의 「안내 사항을 모두 확인했어요.」다. 확인 줄 전체를 눌러도 체크된다. 두 창은 `alertdialog`이고 첫 초점은 「취소」다(디자인 시스템 기본).
- Interaction: 체크박스 눌림·선택 전환(Dissolve / Ease out / 75ms)은 디자인 시스템 `Checkbox` 기본 동작이다.

## 검증

- [x] 상태별 UI: 체크 전·후·해제, 확인 실패, 최종 확인·취소, 직전 재확인, 탈퇴 성공·실패·쿠키 정리 실패, 권한 이전 안내·이동·취소, 혼자 있는 번치, 뒤로 가기(가짜 서버 테스트)
- [x] route: 전환 경계, 검색 제외(테스트)
- [ ] 실기기, 스크린 리더

## 확인할 항목

- 묶음 제목 색 (제안): Figma가 의미 토큰이 아니라 primitive 색(`red/color-feedback-red-600`, `green/color-primitive-green-800`)을 썼다. 그대로 primitive 클래스로 맞췄다. 의미 토큰(`system-fail-text`는 red-500)이 생기면 바꾼다.
- 「남는 기록」 항목의 제목·설명 사이 (제안): Figma는 2px로 「삭제되는 정보」(4px)와 다르다. 두 묶음을 같은 모양으로 보고 4px로 맞췄다.
- 「댓글」 설명의 따옴표 (제안): Figma 「‘작성자'」는 여닫는 따옴표가 섞여 있어 「번들 속 코멘트」와 같은 ‘작성자’로 맞췄다.
- 1110판 대조 (2026-11-10): 안내 화면과 두 창의 문구는 7.6.1~7.6.4와 같다.
- 탈퇴 오류 코드 (백엔드 확인): Swagger에 탈퇴 거절(남은 메인 관리자 번치 등)의 오류 코드가 없어 모든 실패를 같은 토스트로 보인다. 가짜 서버는 `MOCK_WITHDRAWAL_OWNER`를 쓴다.
- 세션 종료 (백엔드 확인): 탈퇴가 서버의 refresh 토큰까지 폐기하는지. 웹은 탈퇴 뒤 BFF 로그아웃으로 이 기기의 쿠키를 지운다.
