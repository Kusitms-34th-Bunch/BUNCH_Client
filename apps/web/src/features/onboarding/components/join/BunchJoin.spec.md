# 페이지: 초대받은 번치 참여(초대 링크 입력)

## 메타데이터

- Route: `/onboarding/join`(`apps/web/src/app/(app)/onboarding/join/page.tsx`)
- Status: UI와 입력·붙여넣기·형식 검사·초대 확인 요청·오류 토스트·중단 모달 구현됨(headless Chromium 375×812 렌더를 Figma 값과 대조함). 「완료」가 `POST /invitations/verify`로 초대를 확인하고 참여할 수 있으면 초대 확인 화면으로 이동한다(이슈 #308). 실서버 검증 전, 실기기 검증 전
- 디자인 출처: Figma `Bunch/Join/Empty`(node `791:2916`), 초점·키보드(`1229:11098`), 유효하지 않은 링크 토스트(`791:2935`), 인원 초과 토스트(`791:2955`), 입력됨(`791:2975`), 중단 모달(`791:13773`). 화면설계서를 함께 참고했다.

## 목적과 범위

### 포함

- 초대 링크를 붙여넣거나 입력하고 「완료」를 누르는 첫 참여 화면. 구성: 헤더(왼쪽 뒤로 가기), 제목 「초대받은 번치에 참여해볼까요?」(설명 없음), 링크 입력창과 안쪽 「붙여넣기」 버튼, 하단 「완료」.
- 「붙여넣기」는 클립보드의 링크를 입력창에 채운다.
- 형식이 틀린 링크로 「완료」를 누르면 토스트 「유효하지 않은 링크입니다.」, 서버가 인원 초과를 알리면 토스트 「최대 인원을 초과한 번치입니다.」를 「완료」 위에 3초간 띄운다.
- 뒤로 가기는 중단 확인 모달(「번치 참여를 그만둘까요?」, 「나가기」·「계속 참여하기」)을 연다. 「나가기」는 피드로 이동한다.
- 시작 화면의 「초대받은 번치 참여하기」가 이 화면으로 이동한다(Slide In, `BunchStartSelect.spec.md`).

### 범위 외

- 초대 링크 진입(Universal Link·초대 정보 보관·웹 초대장)과 참여 요청(`BunchJoinInvitation.spec.md`).
- iPhone 상태 바·홈 인디케이터·키보드(기기 요소. Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/onboarding/join`. params와 search는 없다. 초대 링크를 URL로 받아 입력창을 미리 채우는 진입은 정해지지 않았다(확인할 항목).
- 접근 권한·guard: 아직 없다(로그인 미구현). draft를 읽지 않아 입력 순서 가드도 두지 않았다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. `create/layout.tsx`의 draft provider 밖이다. 「나가기」는 `router.replace('/')`(피드, 임시)로 이동해 뒤로 가기로 돌아오지 않는다.

## 상태와 흐름

- 초기 진입: 입력창이 비어 있고 「완료」는 비활성이다.
- 입력: 공백만 아닌 값이 있으면 「완료」가 활성화된다(Figma의 비활성 `surface-disabled` → 활성 `surface-inversed`).
- 초점: 입력창 테두리가 진한 색으로 바뀌고 안내 문구가 사라진다(`TextField`의 Figma Focused).
- 「붙여넣기」: `navigator.clipboard.readText()`로 읽어 앞뒤 공백을 지우고 채운 뒤 입력창에 초점을 줘서 스크린 리더가 채운 값을 읽게 한다. 읽기가 막히면(권한 거부·비보안 환경) 값은 그대로 두고 입력창에 초점만 줘서 직접 붙여넣게 한다.
- 「완료」: 형식(링크 URL 또는 토큰·보조 코드)이 틀리면 `invalid` 토스트. 형식이 맞으면 서버에 초대를 확인한다(`POST /invitations/verify`). 요청 중에는 `PageLoading`을 덮고 항상 마운트된 `role="status"`에 「초대를 확인하는 중이에요」를 알리며 「완료」를 잠근다. 결과별 처리는 아래 데이터 의존성을 따른다. 참여할 수 없으면 입력값은 그대로 둔다.
- 토스트: `toast()`가 3초간 띄운다(`Toast.spec.md`). 하단 「완료」 버튼 영역(`PageShell`의 bottom 슬롯) 바로 위 4px에 목록 폭으로 뜬다(`wrapper` 앵커, Figma `6079:176183`). 이전의 버튼 위 10px(`bottomOffset: 42`)은 2026-11-10에 이 규칙으로 바꿨다.
- Loading·Empty·Error·retry: 확인 요청 중 `PageLoading`(앱 공통 로딩)과 숨김 안내 문구. 오류는 토스트(3초)로 알리고 입력값을 유지해 바로 고쳐 다시 시도할 수 있다.

## 데이터 의존성

- Query와 enabled 조건: 없음. Mutation·cache 영향: `useVerifyInvitationMutation`(`POST /invitations/verify`). 참여하지 않으므로 cache를 바꾸지 않는다. 성공하면 확인한 초대(입력값과 카드)를 join layout의 `JoinInvitationProvider`에 남긴다.
- API 계약: 요청 `invitation`(초대 링크 URL·토큰·8자리 보조 코드 중 하나, 서버가 코드를 trim·대문자로 맞춤), 응답 `card`(이름·소개·이미지·초대한 사람)·`eligibility`. 판단 순서는 초대 무효 → 이미 소속 → 정원 8명 → 내 소속 10개. `AVAILABLE`이면 초대 확인 화면으로 `router.push`, `ALREADY_MEMBER`는 토스트 「이미 참여 중인 번치예요.」 뒤 번치(임시 피드)로 `replace`, `FULL`은 「최대 인원을 초과한 번치입니다.」, `LIMIT_EXCEEDED`는 「참여할 수 있는 번치는 최대 10개예요.」, 404 `INVITE_001`은 「유효하지 않은 링크입니다.」(없음·만료·폐기를 구분하지 않음), 그 밖(429 `REQUEST_002` 포함)은 일시적 오류 토스트. 입력은 링크 URL이거나 토큰·보조 코드 형식(`isInviteInput`)일 때만 보내고 형식이 아니면 서버에 묻지 않는다(무효 입력 횟수 제한 보호). 서버가 무효 입력을 10분에 10회까지만 허용한다.

## UI와 접근성

- Component mapping: `core`의 `Header`(뒤로 가기), `TextField`(`action` 슬롯에 `Button brandSubtle sm`「붙여넣기」), `Button`(「완료」), `toast()`. `web`의 `PageHeader`(제목만). 중단 모달은 feature 공용 `ExitFlowDialog`(`hooks/useExitFlowDialog`)이고 번치 만들기 흐름과 같이 쓴다. 링크 형식 검사는 `lib/inviteLink.ts`다.
- 「완료」 비활성: 입력이 비면 `disabled`이고 이유는 별도로 전달하지 않는다(Figma가 비활성 상태를 정의했고 입력창의 이름·안내 문구가 이유를 설명한다). 이유 전달이 필요하면 `aria-disabled`와 `aria-describedby`로 바꾼다(접근성 리뷰의 제안).
- Keyboard·focus·accessible name: 뒤로 가기, 링크 입력창(이름 「초대 링크」, `inputMode=url`, 자동 완성·대문자·맞춤법 검사 끔), 「붙여넣기」, 「완료」. 토스트의 읽기는 `sonner`의 `aria-live` 영역이 맡는다(`Toast.spec.md`). 모달은 첫 초점이 「계속 참여하기」이고 ESC는 모달만 닫는다(`Dialog.spec.md`).
- Responsive·긴 텍스트: 링크는 입력창 안에서 한 줄로 잘린다(전체를 선택해 확인할 수 있다). 375px에서 가로 넘침이 없다.

| Figma        | 값                                                                                   | 사용한 토큰·utility                          |
| ------------ | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| 제목         | Title-1 22/28, 위 12, 좌우 16                                                        | `PageHeader`(제목만)                         |
| 입력창       | 343×46, radius 10, 테두리 `border-secondary`, 제목 아래 12                           | `TextField`, `pt-s6 px-padding-p8`           |
| 「붙여넣기」 | 32 높이, 12 좌우, radius 8, 13/600, 배경 `surface-brand-subtle-1`, 글자 `text-brand` | `Button variant="brandSubtle" size="sm"`     |
| 「완료」     | 343×48, 17/600, 위 10 좌우 16, 비활성 `surface-disabled`                             | `Button`(기본) `pt-padding-p5 px-padding-p8` |
| 토스트       | 343×46, 「완료」 영역 위 4                                                           | `toast()` (`wrapper` 앵커)                   |
| 중단 모달    | 311 폭, 제목·설명·버튼 2개                                                           | `Dialog` 부품(`ExitFlowDialog`)              |

## 검증

- [x] 관련 test: `BunchJoin.test.tsx`(제목·main, 완료 활성 조건, 붙여넣기 성공·실패, 형식 오류 토스트, 초대 확인 성공·이미 참여·정원·한도·무효·일시 오류, 보조 코드 입력, 중단 모달 열기·계속·나가기), `lib/inviteLink.test.ts`(링크·토큰·코드 형식 판정), `api/invitations.test.ts`, `mocks/handlers/handlers.test.ts`(가짜 서버 초대 확인·참여)
- [x] 브라우저 렌더 대조(headless Chromium, 375×812): 제목 y60·높이 28, 입력창 343×46(y100), 「붙여넣기」 32 높이 폰트 13/600, 「완료」 343×48 하단, 토스트 343×46으로 「완료」 위 10px, 중단 모달 311×188과 「피드로 / 이동해요.」 줄바꿈이 Figma와 맞다. 「나가기」는 `/`로 이동한다. 가로 넘침 없음
- [ ] 키보드가 올라온 상태(Figma `1229:11098`)의 레이아웃: 실기기 미검증
- [ ] 클립보드 읽기 권한·iOS WebView 동작: 실기기 미검증

## 확인할 항목

- 「붙여넣기」 버튼 배경 토큰 (해소, 2026-10-19): 저장소 `surface-brand-subtle-1`이 `#e2e4ff`로 Figma(`#f1f2ff`)와 달랐으나 `develop`의 PR #60으로 `bunch-50`이 되어 같아졌다(코드 변경 없음).
- 모달 취소 버튼 글자 (확정, 2026-10-19, 사용자 확인): 「계속 참여하기」다. 참여 흐름 확인 화면 Figma(`791:13839`)와 같고, 이 화면 Figma(`791:13773`)와 설계서 본문의 「계속 만들기」는 만들기 흐름 문구가 남은 것으로 본다.
- 키보드 상태 Figma의 「붙여넣기」 버튼 글자 (확인 필요): 노드 `1229:11098`의 버튼이 「BUTTON」(자리 표시 글자)으로 남아 있어 「붙여넣기」로 구현했다.
- 링크 형식 (확인 필요): 호스트(운영 도메인)가 정해지지 않아 `https`와 `/invite/<코드>` 경로만 검사한다. 호스트를 제한할지, 링크가 짧은 코드만 받는 형태인지 확인한다.
- 링크 확인의 판정 주체 (확정): Figma의 「잘못된링크」·「인원초과링크」·「정상링크」는 서버가 판단하는 예시다. 형식이 맞는 입력이 유효한지·인원이 찼는지는 `POST /invitations/verify`가 알려 주고, 화면은 그 결과(`eligibility`·오류 코드)를 토스트로 옮긴다.
- 토스트 노출 시간 (확정, 2026-10-19): 설계서의 Toast Interaction대로 3초다.
- 서버 오류 문구 (1110판, API 미연결): 기능명세서 1110판(2026-11-10) 2.5는 링크 확인의 네트워크·서버 오류와 반복 입력 제한(Rate Limit) 모두 「일시적인 오류가 발생했어요. 다시 시도해 주세요」를 쓴다(이전 판 「잠시 후 다시 시도해 주세요」). 링크 확인 API를 붙일 때 `JoinFailure`에 이 경우를 더한다.
- 모달 모션 (확정, 2026-10-19, 사용자 결정): 화면설계서의 Move in ↑·Ease in·300ms를 따르지 않고 지금 구현(중앙 확대+페이드, 패널 200ms)을 쓴다. 번치 만들기 모달과 같은 구현이다(`ExitFlowDialog`).
- 모달을 연 채 브라우저 뒤로 가기 (미검증): 모달은 history를 만들지 않고 `OverlayProvider`가 `(app)` layout에 있어, 뒤로 가기로 화면이 바뀌어도 모달이 남을 수 있다(번치 만들기 흐름과 같은 한계).
- 화면 전환 (구현, 2026-10-19 확인): 시작 화면의 「초대받은 번치 참여하기」에서 SSGOI Slide In으로 들어온다. page를 `data-ssgoi-transition` 래퍼로 감싸야 `AppTransitions`의 시작 → 참여 규칙이 걸린다. headless Chromium에서 이전·새 화면에 각각 약 233ms 애니메이션이 붙는 것을 확인했다. 시작 화면의 「초대받은 번치 참여하기」에서 Slide In으로 들어온다(`BunchStartSelect.spec.md`, `docs/architecture/motion.md`).
