# 페이지: MY

## 메타데이터

- Route: `/my`(하단 탭 「마이페이지」, `app/(app)/(main)/my/page.tsx`)
- Status: UI 구현됨(Figma 값과 측정으로 대조함. 내 정보 API 연결 전, 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `MY`(node `4096:75220`), 화면 설계서 `MY(1)`(node `4096:48291`)
- 이슈: #210

## 목적과 범위

### 포함

- 헤더 「MY」, 내 프로필 행(프로필 이미지·닉네임·오른쪽 화살표), 메뉴 묶음 3개(알림 / 약관 및 정책 / 고객지원).
- 프로필 행을 누르면 개인 프로필 수정으로, 화면 이동 메뉴는 각 경로로 이동한다.

### 범위 외

- 내 정보 API(`GET /members/me`) 연결과 loading·error 상태. 이 이슈는 UI만 만들고 page가 Figma 예시 값(`myProfileFixture`)을 넘긴다.
- 메뉴 상세 화면. 경로만 연결해 두었고, 각 화면은 이어지는 MY 이슈에서 만든다. 그전까지 링크를 누르면 404다.
- 문의하기·로그아웃 확인 창. 지금은 버튼만 있고 눌러도 동작하지 않는다(MY 약관·문의·로그아웃 이슈에서 연결).

## Route와 접근

- Path·params·search: `/my`, 없음.
- 접근 권한·guard: `(app)` 그룹의 기존 기준을 따른다. 이 화면이 추가한 guard는 없다.
- Layout·redirect·navigation: `MainTabPage`(탭 전환) 안의 `PageShell`. 메뉴 경로는 `MY_PATHS`.

| 메뉴              | 동작                      |
| ----------------- | ------------------------- |
| 프로필 행         | 링크 `/my/profile`        |
| 알림 설정         | 링크 `/my/notifications`  |
| 서비스 이용약관   | 링크 `/my/terms/service`  |
| 개인정보 처리방침 | 링크 `/my/terms/privacy`  |
| 문의하기          | 버튼(확인 창은 후속 이슈) |
| 로그아웃          | 버튼(확인 창은 후속 이슈) |
| 탈퇴하기          | 링크 `/my/withdrawal`     |

## 상태와 흐름

- 초기 진입: 프로필과 메뉴를 바로 그린다.
- Loading·Empty·Error·retry: 데이터를 불러오지 않아 없다. API를 연결할 때 정한다.
- 메뉴 눌림: `MenuLabel` 기본 동작(누르는 동안 `overlay-hover`, 75ms). 프로필 행도 같은 눌림을 쓴다.

## 데이터 의존성

- Query와 enabled 조건: 없음. 화면은 `profile`(`nickname`, `imageSrc?`)을 prop으로 받는다.
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

- 닉네임 색 (제안): Figma는 변수 없이 `#000000`이다. 가장 가까운 `text-primary`를 썼다.
- 프로필 행 눌림 (제안): Figma에는 프로필 행의 눌림 모양이 없다. 메뉴와 같은 `overlay-hover`를 넣었다.
- 프로필 행 누르는 영역 (제안): 화면 설계서는 화살표를 누르면 이동한다고 적었다. 누르기 쉽도록 행 전체를 링크로 만들었다.
