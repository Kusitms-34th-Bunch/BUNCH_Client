# 페이지: 초대 링크 진입

## 메타데이터

- Route: `/invite/[token]`(`apps/web/src/app/invite/[token]/page.tsx`, 레이아웃 `app/invite/layout.tsx`)
- Status: UI와 「초대장 확인하기」 동작, 장식 모션 구현됨(이슈 #312). 「앱 설치하기」는 앱스토어 연결 전이라 누르면 임시 안내 토스트만 보임. 유니버셜 링크는 이번 범위 밖(`docs/workflows/invite-link-entry.md`). Figma와 실제 렌더 비교, 실기기 검증 전
- 디자인 출처: Figma 「BUNCH - 작업파일」의 초대 진입 페이지(node `6400:85935`), 모션 데이터(로고 묶음 `6400:85954`, 픽셀 장식 `6400:85943`·`6400:85948`·`6400:85953`)

## 목적과 범위

### 포함

- 카카오톡 등 앱 밖에서 초대 링크로 들어온 사람이 먼저 보는 페이지: 전체 화면 사진 배경(딤 40%, 아래 그라데이션), 픽셀 `bunch` 로고와 「함께한 순간이 모이는 곳」, 픽셀 장식, 아래 「앱 설치하기」·「초대장 확인하기」.
- 「초대장 확인하기」: 공개 조회로 링크가 유효한지 확인하고, 유효하면 초대 정보를 보관한 뒤 초대 진입(`/onboarding/join/enter`)으로 이동한다.

### 범위 외

- 유니버셜 링크(앱으로 먼저 넘기기), 앱스토어 이동, 설치 직후 이어받기, 링크 미리보기(OG). 모두 `docs/workflows/invite-link-entry.md`의 「아직 연결하지 않은 것」.
- 로그인 판별. 이동한 곳의 접근 가드(`AuthGate`)가 맡는다.

## Route와 접근

- Path·params: `/invite/{토큰}`. 토큰은 경로 조각으로 `InviteEntry`에 전달한다.
- 접근 권한·guard: 없다. `(app)` 그룹 밖이라 `AuthGate`를 거치지 않아 비로그인·가입 중 사용자도 볼 수 있다(앱 밖 사용자가 대상). 검색에는 노출하지 않는다(`robots: noindex`).
- Layout: `app/invite/layout.tsx`가 폰트·`QueryProvider`·`Toaster`만 둔다. 전체 화면 캔버스라 `AppFrame` 없이 자체 틀(`max-w-(--app-max-width)`, `min-h-dvh`, 아래 Safe Area)을 쓴다.
- 이어 가는 경로(`continueHref`)는 다른 feature(onboarding) 소유라 route가 전달한다.

## 상태와 흐름

- 진입: 장식(로고 묶음, 픽셀 3개)이 아래에서 올라오며 나타난다(2.4초, 한 번). **CSS 키프레임만으로**(`globals.css`의 `invite-rise-*`, `animation-fill-mode: both`) 첫 페인트부터 재생해서 JS·hydration과 무관하고, 완성된 모양이 먼저 보였다가 다시 시작하는 깜빡임이 없다.
- 「초대장 확인하기」: `GET /invitations/{토큰}`(공개). 같은 틱의 중복 탭은 ref로 막고 요청 중에는 버튼을 잠그고 `PageLoading`을 덮는다.
  - 성공: `savePendingInvitation(토큰)` 뒤 `router.push(continueHref)`. 뒤로 가기로 이 페이지에 돌아올 수 있고, 브라우저가 화면을 그대로 복원하면(bfcache, `pageshow`의 `persisted`) 로딩과 중복 탭 잠금을 풀어 다시 확인할 수 있다.
  - 404 `INVITE_001`(없음·만료·폐기, 구분하지 않음): 토스트 「유효하지 않은 링크입니다.」, 이동하지 않고 보관하지 않는다.
  - 그 밖(네트워크·서버): 토스트 「일시적인 오류가 발생했어요. 다시 시도해 주세요」, 다시 누를 수 있다.
- 「앱 설치하기」: Figma대로 활성 모양(회색 `secondary`)이다. `onInstallApp`이 없으면 누를 때 토스트 「앱스토어 이동은 곧 지원돼요.」(기획 원문 없는 임시 문구)만 보인다. 유니버셜 링크를 붙일 때 호출부(`page.tsx`)가 핸들러를 넘긴다.
- 동작 줄이기: `@media (prefers-reduced-motion: reduce)`에서 이동 없이 투명도 변화만 재생한다.
- 토스트: 두 버튼이 있는 하단 영역에 `data-toast-anchor="wrapper"`를 달아 토스트가 버튼 영역 바로 위 4px에 뜬다(로그인 화면과 같은 방식).

## 데이터 의존성

- Mutation: `useLookupInvitationMutation`(`GET /invitations/{token}`). 서버 상태를 바꾸지 않아 cache를 건드리지 않는다. 응답은 번치 이름만 검사하고 카드 내용은 쓰지 않는다(초대 확인 화면이 로그인 뒤 `POST /invitations/verify`로 받는다).
- 보관: `shared/lib/pendingInvitation.ts`(24시간, 가장 최근 하나, 로그아웃·참여 완료·포기 시 삭제).

## UI와 접근성

- Component mapping: 디자인 시스템 `Button`(`secondary` = 앱 설치하기, `brand` = 초대장 확인하기(기본 `primary`는 검정이라 Figma의 브랜드 파랑과 다름)), `Toaster`, 앱의 `PageLoading`. 로고는 로그인 화면과 같은 `shared/assets/images/login/wordmark.svg`(비율 171:43 = Figma 226:56.7).
- 배경 사진: Figma `image 7`을 Figma에 올라간 원본 이미지(816×1456, `download_assets`의 `rawImages`)를 JPEG 품질 90(약 210KB)으로 변환한 `public/images/invite/entry-bg.jpg`를 `next/image`(`fill`, `priority`, `unoptimized`)로 쓴다. Figma 에셋 URL의 기본 export는 574×1024로 줄어 있어 화질이 깨졌고, Next 기본 최적화(품질 75 재압축)도 건너뛴다.
- 시맨틱: `main` 안에 `h1`(로고, 이름 「Bunch」), 배경·딤·그라데이션·픽셀 장식은 `aria-hidden`. 확인 중 상태는 항상 마운트된 `role="status"`(화면에는 숨김)로 알린다.

| Figma           | 값                                                                                                                        | 사용한 토큰·utility                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 배경 딤         | 검정 40%                                                                                                                  | `bg-primitive-black-alpha-40`(`overlay-dim-subtle`은 10%라 Figma와 다름)                 |
| 아래 그라데이션 | 높이 226, 0.65 → 0.4 → 0.08 → 0(위로 갈수록 투명)                                                                         | `h-56.5 bg-[linear-gradient(to_top,…)]`(토큰 없음, `EntryCard`는 0.6이라 같지 않음)      |
| 로고 위치·크기  | 위에서 126, 폭 226                                                                                                        | `pt-31.5`, `width={226}`                                                                 |
| 소개 문구       | Noto Sans KR 14/20, 자간 -0.28, 흰색                                                                                      | `typography-body-3-regular text-text-inversed`(폰트 차이는 확인할 항목)                  |
| 픽셀 장식       | 9px 정사각형, 흰색(`gray-000`)                                                                                            | `bg-icon-inversed size-2.25`                                                             |
| 버튼            | 높이 48, 좌우 16, 아래 44, 간격 6. 앱 설치하기 `surface-tertiary`+`text-primary`, 초대장 확인하기 `surface-brand`+흰 글씨 | `Button`(기본 lg) `variant="secondary"`·`"brand"`, `px-padding-p8 pb-padding-p19 gap-s3` |
| 모션            | 2.4초, 위 12~18px에서 올라오며 투명→불투명, 곡선 `0.33,0,0.15,1`·`0.4,0,0.2,1`                                            | `globals.css`의 `invite-rise-*` 키프레임(Figma 값 그대로, `transform`·`opacity`만)       |

## 검증

- [x] 관련 test: `InviteEntry.test.tsx`(두 버튼과 색 클래스, 앱 설치하기 임시 안내·연결, 토스트 앵커, 유효·무효·형식 오류·일시 오류, 중복 탭, 확인 중 안내, CSS 모션 클래스·숨김 클래스 없음·장식 aria-hidden), `api/invitation.test.ts`
- [ ] Figma와 실제 렌더 비교(레이아웃·색·모션), 375·390px과 큰 화면, 가로 넘침: 하지 못함(브라우저 확인 도구 없음)
- [ ] 키보드·초점, 스크린 리더 낭독: 하지 못함
- [ ] 실기기(카카오톡 인앱 브라우저·Safari): 하지 못함

## 확인할 항목

- 모션 반복 (확인 필요): Figma 데이터는 2.4초 주기 반복 재생이다. 장식이 계속 깜빡이는 것을 피하려고 한 번만 재생했다. 반복이 의도라면 `iterations`를 바꾼다.
- 소개 문구 폰트 (확정 필요): Noto Sans KR → Pretendard(`typography-body-3-regular`, 14/21, 자간 0).
- 「앱 설치하기」 임시 안내 (확인 필요): 앱스토어 연결 전에는 누르면 임시 문구 토스트만 보인다. 문구는 기획 원문이 없다.
- 딤 토큰 (확정): Figma의 `rgba(0,0,0,0.4)`는 `primitive-black-alpha-40`이다. `overlay-dim-subtle`은 `black-alpha-10`이라 쓰지 않았다(처음에 잘못 써서 사진이 밝았음).
- 앱 밖 비로그인 사용자의 막힘 (후속): 브라우저에서는 소셜 로그인을 할 수 없어 「초대장 확인하기」 뒤 로그인 화면에서 막힌다. 유니버셜 링크가 앱으로 넘기면 해소된다(`docs/workflows/invite-link-entry.md`).
