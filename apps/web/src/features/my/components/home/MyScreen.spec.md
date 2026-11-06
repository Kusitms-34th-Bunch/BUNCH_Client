# 페이지: MY

## 메타데이터

- Route: `/my`(하단 탭 「마이페이지」, `app/(app)/(main)/my/page.tsx`)
- Status: UI 구현됨(Figma 값과 측정으로 대조함. 내 정보 API 연결 전, 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `MY`(node `4096:75220`), 문의하기 `4102:84501`, 로그아웃 `4102:84635`, 화면 설계서 `MY(1)`(node `4096:48291`)·`MY(4)`(node `4164:89703`)
- 이슈: #210, #235(문의하기·로그아웃 확인 창)

## 목적과 범위

### 포함

- 헤더 「MY」, 내 프로필 행(프로필 이미지·닉네임·오른쪽 화살표), 메뉴 묶음 3개(알림 / 약관 및 정책 / 고객지원).
- 프로필 행을 누르면 개인 프로필 수정으로, 화면 이동 메뉴는 각 경로로 이동한다.
- 문의하기·로그아웃은 확인 창을 연다(화면 설계서 MY(4) 3·4번).

### 범위 외

- 내 정보 API(`GET /members/me`) 연결과 loading·error 상태. 이 이슈는 UI만 만들고 page가 Figma 예시 값(`myProfileFixture`)을 넘긴다.
- 다른 탭 WebView에 로그아웃 알리기(iOS 쉘). 로그아웃한 탭 WebView만 문서를 새로 불러온다. 나머지 탭 WebView는 이전 사용자의 화면·캐시를 가진 채 남고, 다시 로그인하면 다시 받기 전까지 그 데이터가 보일 수 있다(`docs/architecture/mobile-shell.md`의 탭 WebView 상태 공유 항목). 쉘이 탭 WebView를 모두 다시 불러오는 방식은 후속으로 다룬다.
- 로그아웃 뒤 기록 정리. `location.replace`는 현재 기록 항목만 바꿔 그 앞의 화면으로 뒤로 갈 수 있다. 접근 guard와 401 시 로그인 이동(`onUnauthorized`)을 연결할 때 함께 다룬다. 같은 탭의 `sessionStorage`(지금 번치 id)도 그때 정리한다.

## Route와 접근

- Path·params·search: `/my`, 없음.
- 접근 권한·guard: `(app)` 그룹의 기존 기준을 따른다. 이 화면이 추가한 guard는 없다.
- Layout·redirect·navigation: `MainTabPage`(탭 전환) 안의 `PageShell`. 메뉴 경로는 `MY_PATHS`.

| 메뉴              | 동작                     |
| ----------------- | ------------------------ |
| 프로필 행         | 링크 `/my/profile`       |
| 알림 설정         | 링크 `/my/notifications` |
| 서비스 이용약관   | 링크 `/my/terms/service` |
| 개인정보 처리방침 | 링크 `/my/terms/privacy` |
| 문의하기          | 버튼, 확인 창            |
| 로그아웃          | 버튼, 확인 창            |
| 탈퇴하기          | 링크 `/my/withdrawal`    |

## 상태와 흐름

- 초기 진입: 프로필과 메뉴를 바로 그린다.
- Loading·Empty·Error·retry: 데이터를 불러오지 않아 없다. API를 연결할 때 정한다.
- 메뉴 눌림: `MenuLabel` 기본 동작(누르는 동안 `overlay-hover`, 75ms). 프로필 행도 같은 눌림을 쓴다.
- 문의하기: 확인 창(`ConfirmDialog`) 「'카카오톡'에서 열기」 / 「오픈채팅 상담 채널로 이동해요.」 / 취소·열기. 「열기」는 `contactUrl`을 연다(`https:` 주소만 열고 그 밖은 무시). iOS 쉘에서는 같은 WebView 이동을 쉘이 가로채 카카오톡 앱(없으면 브라우저)으로 열고, 브라우저는 새 탭으로 연다. 주소가 없으면 「열기」를 막는다. page는 카카오톡 채널 주소(`MY_CONTACT_URL`)를 넘긴다.
- 로그아웃: 확인 창 「로그아웃할까요?」 / 취소·로그아웃. 「로그아웃」은 `POST /api/auth/logout`(BFF가 백엔드 세션 폐기를 시도하고 결과와 관계없이 쿠키 삭제)을 보내고, 요청 중에는 다시 누를 수 없다. 성공하면 `/login`을 `location.replace`로 새로 연다(메모리의 사용자 데이터를 비우고, 뒤로 가기로 돌아오지 않음). 실패(네트워크 등)하면 확인 창을 닫고 「로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.」 토스트(공통 mutation 실패 처리)를 띄운다.

## 데이터 의존성

- Query와 enabled 조건: 없음. 화면은 `profile`(`nickname`, `imageSrc?`)과 `contactUrl?`을 prop으로 받는다.
- Mutation: `useLogoutMutation`(`queries/session.ts`) → `logout`(`api/session.ts`). 캐시 무효화 없이 문서를 새로 연다. 이동은 mutation 정의의 `onSuccess`가 맡아, 요청 중 화면이 사라져도 성공하면 로그인 화면으로 간다.
- API 계약 확인 항목: `MemberResponse`의 `nickname`은 계약상 선택이다. 가입을 마친 회원에게 늘 있는지 연결할 때 확인한다.

## UI와 접근성

- Component mapping:

| Figma                    | 값                                                  | 사용한 컴포넌트·토큰                                                           |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| 헤더                     | `Header`(Varient=Icon), 제목 MY                     | `Header` + `h1`                                                                |
| 헤더와 프로필 사이       | 12                                                  | `pt-padding-p6`                                                                |
| 프로필 행                | 좌우 16, 위아래 10, 높이 84                         | `px-padding-p8 py-padding-p5`                                                  |
| 프로필 이미지            | 64(M), 테두리 `#EAEAEA`                             | `ProfileImage size="M"` + `border-border-tertiary border`                      |
| 이미지와 닉네임          | 10                                                  | `gap-s5`                                                                       |
| 닉네임                   | Body-1-SemiBold, `#000000`                          | `typography-body-1-semi-bold text-text-primary`                                |
| 오른쪽 화살표            | 24(L), `#BCBEC2`                                    | `LineChevronRightLargeIcon`, `text-icon-quaternary`                            |
| 프로필과 메뉴, 묶음 사이 | 20, 12                                              | `gap-s10`, `gap-s6`                                                            |
| 묶음 제목                | Body-4-SemiBold `text-quaternary`, 좌우 16·위아래 6 | `typography-body-4-semi-bold text-text-quaternary px-padding-p8 py-padding-p3` |
| 제목과 메뉴, 메뉴 좌우   | 4, 12                                               | `gap-s2`, `px-padding-p6`                                                      |
| 메뉴 한 줄               | `Menu Label`(오른쪽 화살표)                         | `MenuLabel`                                                                    |

- Keyboard·focus·accessible name: 제목 「MY」가 `h1`, 묶음 제목은 `h2`다. 묶음은 이름 없는 `section`이라 랜드마크가 아니다(「알림」 묶음에 이름을 붙이면 토스트 영역 「알림」과 같은 이름의 랜드마크가 생겨 axe `landmark-unique` 위반). 프로필 행 링크 이름은 「{닉네임} 프로필 수정」(뒷부분은 화면에 보이지 않음)이고 이미지는 장식이다. 포커스 윤곽선은 프로필 행 안쪽 2px `border-brand`, 메뉴는 `MenuLabel` 기본.
- Responsive·긴 텍스트·overflow: 닉네임은 한 줄 말줄임(최대 12자라 실제로는 거의 잘리지 않음), 화살표는 줄어들지 않는다. 메뉴가 화면보다 길면 `PageShell` 본문이 스크롤된다.

## 검증

- [x] direct URL·params/search: `/my`를 개발 서버에서 직접 열어 확인
- [ ] 권한·redirect: 이 화면이 바꾸지 않아 확인하지 않음
- [x] 상태별 UI: 프로필 사진 있음·없음(테스트)
- [x] 관련 test 또는 E2E
- [x] 실행 command와 결과

실행한 검증: `yarn workspace @app/web typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`, `vitest run src/features/my`(4개 통과). 개발 서버(`next dev --webpack`)에서 `/my`를 열어 헤더 48, 프로필 행 위 12·높이 84, 이미지 위치 16·간격 10, 화살표 오른쪽 16, 묶음 시작 위치(본문 기준 116·204·334)와 묶음 제목 13px·600·높이 30을 Figma 값과 측정으로 대조했다. 스크린 리더와 실기기는 확인하지 않았다.

## 확인할 항목

- 문의하기 확인 창 모양 (제안): Figma는 iOS 시스템 Alert(파란 「열기」)로 그렸다. 웹에서는 시스템 창을 띄울 수 없어 다른 확인 창과 같은 `ConfirmDialog`에 같은 문구를 썼다.
- 로그아웃 실패 문구 (제안): 화면 설계서에 없어 다른 실패 토스트와 같은 형태로 정했다.

- 닉네임 색 (제안): Figma는 변수 없이 `#000000`이다. 가장 가까운 `text-primary`를 썼다.
- 프로필 행 눌림 (제안): Figma에는 프로필 행의 눌림 모양이 없다. 메뉴와 같은 `overlay-hover`를 넣었다.
- 프로필 행 누르는 영역 (제안): 화면 설계서는 화살표를 누르면 이동한다고 적었다. 누르기 쉽도록 행 전체를 링크로 만들었다.
