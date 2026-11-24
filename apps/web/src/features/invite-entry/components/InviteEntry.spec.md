# 페이지: 초대 링크 진입

## 메타데이터

- Route: `/invite/[token]`(`apps/web/src/app/invite/[token]/page.tsx`, 레이아웃 `app/invite/layout.tsx`)
- Status: UI와 「초대장 확인하기」 동작, 장식 모션 구현됨(이슈 #312). 「앱 설치하기」는 App Store 링크(#479), 유니버셜 링크로 앱 안에서 열린 경우의 동작과 Smart App Banner 반영(#489, `docs/workflows/invite-link-entry.md`). Figma와 실제 렌더 비교, 실기기 검증 전
- 디자인 출처: Figma 「BUNCH - 작업파일」의 초대 진입 페이지(node `6400:85935`), 모션 데이터(로고 묶음 `6400:85954`, 픽셀 장식 `6400:85943`·`6400:85948`·`6400:85953`)

## 목적과 범위

### 포함

- 카카오톡 등 앱 밖에서 초대 링크로 들어온 사람이 먼저 보는 페이지: 전체 화면 사진 배경(딤 40%, 아래 그라데이션), 픽셀 `bunch` 로고와 「함께한 순간이 모이는 곳」, 픽셀 장식, 아래 「앱 설치하기」·「초대장 확인하기」.
- 「초대장 확인하기」: 앱 안은 공개 조회로 링크가 유효한지 확인한 뒤 초대 정보를 보관하고 초대 진입(`/onboarding/join/enter`)으로, 앱 밖은 앱이 있으면 앱(초대 토큰 그대로), 없으면 App Store로 넘긴다(브라우저는 소셜 로그인 불가).

### 범위 외

- 앱을 여는 일(유니버셜 링크 설정·쉘의 링크 전달)과 설치 직후 이어받기. `docs/workflows/invite-link-entry.md`. 링크 미리보기(OG)는 route의 `generateMetadata`가 맡는다(같은 문서).
- 로그인 판별. 이동한 곳의 접근 가드(`AuthGate`)가 맡는다.

## Route와 접근

- Path·params: `/invite/{토큰}`. 토큰은 경로 조각으로 `InviteEntry`에 전달한다.
- 접근 권한·guard: 없다. `(app)` 그룹 밖이라 `AuthGate`를 거치지 않아 비로그인·가입 중 사용자도 볼 수 있다(앱 밖 사용자가 대상). 검색에는 노출하지 않는다(`robots: noindex`).
- Layout: `app/invite/layout.tsx`가 폰트·`QueryProvider`·`Toaster`만 둔다. 전체 화면 캔버스라 `AppFrame` 없이 자체 틀(`max-w-(--app-max-width)`, `min-h-dvh`, 아래 Safe Area)을 쓴다.
- 이어 가는 경로(`continueHref`)는 다른 feature(onboarding) 소유라 route가 전달한다.

## 상태와 흐름

- 진입: 장식(로고 묶음, 픽셀 3개)이 아래에서 올라오며 나타난다(2.4초, 한 번). **CSS 키프레임만으로**(`inviteRise.module.css`, `animation-fill-mode: both`) 첫 페인트부터 재생해서 JS·hydration과 무관하고, 완성된 모양이 먼저 보였다가 다시 시작하는 깜빡임이 없다.
- 「초대장 확인하기」(앱 안): `GET /invitations/{토큰}`(공개). 같은 틱의 중복 탭은 ref로 막고 요청 중과 확인 뒤 이동할 때까지 버튼을 잠그고 화면은 덮지 않는다(2026-11-20 기준: 짧은 저장·확인 뒤 화면 이동은 덮지 않음, `docs/architecture/motion.md` 「로딩 상태」).
  - 성공(앱 안): `savePendingInvitation(토큰)` 뒤 `router.replace(continueHref)`. 브라우저가 화면을 그대로 복원하면(bfcache, `pageshow`의 `persisted`) 로딩과 중복 탭 잠금을 푼다.
  - 앱 밖: 서버에 묻지 않고(iOS는 누른 그 순간의 이동만 앱을 열고 복사도 누른 동작 안에서만 허용) 형식만 확인한 뒤 넘긴다. 카카오톡 인앱 브라우저(iOS, User-Agent `KAKAOTALK`)는 `kakaotalk://web/openExternal?url={이 페이지 출처}/invite/{토큰}`, 그 밖의 iPhone·iPad는 `https://app.bunch.kr/invite/{토큰}`을 안내 없이 복사하고 `https://open.bunch.kr/invite/{토큰}`(앱이 있으면 앱, 없으면 서버가 App Store로), iOS가 아니면 토스트 「지금은 iOS 앱만 지원해요.」. 초대는 보관하지 않고 버튼은 잠그지 않는다. 이동은 `lib/externalLink.ts`의 `openExternalUrl`.
- 카카오톡 인앱 브라우저(iOS): 열리자마자 한 번 위의 외부 열기를 요청한다(형식이 아닌 토큰은 보내지 않음). 막혀 남으면 「초대장 확인하기」가 같은 요청을 다시 한다. 앱 있으면 앱, 없으면 Safari로 열릴 것으로 예상하나 실기기 확인 전이다.
  - 404 `INVITE_001`(없음·만료·폐기, 구분하지 않음): 토스트 「유효하지 않은 링크입니다.」, 이동하지 않고 보관하지 않는다.
  - 그 밖(네트워크·서버): 토스트 「일시적인 오류가 발생했어요. 다시 시도해 주세요」, 다시 누를 수 있다.
- 「앱 설치하기」: Figma대로 활성 모양(회색 `secondary`)이다. 외부 주소로 가는 동작이라 링크(`ButtonLink`, `<a href>`)이고 같은 탭에서 App Store 앱 페이지(`APP_STORE_URL`, `https://apps.apple.com/app/id6834488511`)를 연다(기능명세 2.7.1, 인앱 브라우저의 새 탭 차단을 피함). iPhone·iPad가 아니면(Android·PC, iPadOS는 Mac처럼 알려 터치 지점 수로 구분) 링크 대신 같은 모양의 버튼으로 그리고, 누르면 토스트 「지금은 iOS 앱만 지원해요.」(기획 원문 없는 임시 문구)를 띄운다. 서버·hydration은 링크로 그린다.
- 앱 안(쉘 WebView, `isNativeShell`): 유니버셜 링크로 앱이 열려 쉘이 이 경로를 연 경우다. 「앱 설치하기」를 그리지 않고(서버·hydration은 앱 밖으로 그린 뒤 사라짐), iOS 시스템 탭 바는 layout의 `NativeTabBarVisibility`가 숨긴다. 누르지 않아도 한 번 바로 확인한다. 성공하면 `router.replace`로 이어 가서 뒤로 가기로 돌아와 다시 확인되지 않는다. 실패(무효·형식 오류·일시 오류)는 토스트를 띄우고 이 화면에 머물며 「초대장 확인하기」로 다시 시도할 수 있고, 처음 실행이면 접근 가드를 거치지 않아 이 화면이 앱 스플래시를 닫는다(`appBridge.appReady`).
- Smart App Banner: route metadata의 `itunes`(`appId`, 「열기」가 앱에 넘기는 `appArgument` = 이 초대 링크). iPhone·iPad Safari에서만 Safari가 그린다(모양 변경 불가, 인앱 브라우저·앱 WebView에는 없음).
- 동작 줄이기: `@media (prefers-reduced-motion: reduce)`에서 이동 없이 투명도 변화만 재생한다.
- 토스트: 두 버튼이 있는 하단 영역에 `data-toast-anchor="wrapper"`를 달아 토스트가 버튼 영역 바로 위 4px에 뜬다(로그인 화면과 같은 방식).

## 데이터 의존성

- Mutation: `useLookupInvitationMutation`(`GET /invitations/{token}`). 서버 상태를 바꾸지 않아 cache를 건드리지 않는다. 응답은 번치 이름만 검사하고 카드 내용은 쓰지 않는다(초대 확인 화면이 로그인 뒤 `POST /invitations/verify`로 받는다).
- 보관: `shared/lib/pendingInvitation.ts`(24시간, 가장 최근 하나, 로그아웃·참여 완료·포기 시 삭제).

## UI와 접근성

- Component mapping: 디자인 시스템 `Button`(`secondary` = 앱 설치하기, `brand` = 초대장 확인하기(기본 `primary`는 검정이라 Figma의 브랜드 파랑과 다름)), `Toaster`. 로고는 로그인 화면과 같은 `shared/assets/images/login/wordmark.svg`(비율 171:43 = Figma 226:56.7).
- 배경 사진: 디자이너에게 받은 딤 없는 원본 사진(1354×1630)에서 Figma `image 7`과 같은 영역(가로 233~1145, 912×1630)을 잘라 WebP 품질 90(약 160KB, #554)로 만든 `public/images/invite/entry-bg.webp`를 `next/image`(`fill`, `priority`, `unoptimized`)로 쓴다. Figma 에셋 URL의 기본 export는 574×1024로 줄어 있어 화질이 깨졌고, Next 기본 최적화(품질 75 재압축)도 건너뛴다.
- 시맨틱: `main` 안에 `h1`(로고, 이름 「Bunch」), 배경·딤·그라데이션·픽셀 장식은 `aria-hidden`. 확인 중 상태는 항상 마운트된 `role="status"`(화면에는 숨김)로 알린다.

| Figma           | 값                                                                                                                        | 사용한 토큰·utility                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 배경 딤         | 검정 40%                                                                                                                  | `bg-primitive-black-alpha-40`(`overlay-dim-subtle`은 10%라 Figma와 다름)                 |
| 아래 그라데이션 | 높이 226, 0.65 → 0.4 → 0.08 → 0(위로 갈수록 투명)                                                                         | `h-56.5 bg-[linear-gradient(to_top,…)]`(토큰 없음, `EntryCard`는 0.6이라 같지 않음)      |
| 로고 위치·크기  | 위에서 126, 폭 226                                                                                                        | `pt-31.5`, `width={226}`                                                                 |
| 소개 문구       | Noto Sans KR 14/20, 자간 -0.28, 흰색                                                                                      | `typography-body-3-regular text-text-inversed`(폰트 차이는 확인할 항목)                  |
| 픽셀 장식       | 9px 정사각형, 흰색(`gray-000`)                                                                                            | `bg-icon-inversed size-2.25`                                                             |
| 버튼            | 높이 48, 좌우 16, 아래 44, 간격 6. 앱 설치하기 `surface-tertiary`+`text-primary`, 초대장 확인하기 `surface-brand`+흰 글씨 | `Button`(기본 lg) `variant="secondary"`·`"brand"`, `px-padding-p8 pb-padding-p19 gap-s3` |
| 모션            | 2.4초, 위 12~18px에서 올라오며 투명→불투명, 곡선 `0.33,0,0.15,1`·`0.4,0,0.2,1`                                            | `inviteRise.module.css` 키프레임(Figma 값 그대로, `transform`·`opacity`만)               |

## 검증

- [x] 관련 test: `InviteEntry.test.tsx`(두 버튼과 색 클래스, 앱 설치하기 연결과 iOS가 아닌 기기 안내, 토스트 앵커, 유효·무효·형식 오류·일시 오류, 중복 탭, 확인 중 안내, CSS 모션 클래스·숨김 클래스 없음·장식 aria-hidden), `InviteEntry.shell.test.tsx`(앱 안: 설치 버튼 숨김, 자동 확인 한 번, replace, 실패 시 머묾·스플래시 닫기), `api/invitation.test.ts`
- [ ] Figma와 실제 렌더 비교(레이아웃·색·모션), 375·390px과 큰 화면, 가로 넘침: 하지 못함(브라우저 확인 도구 없음)
- [ ] 키보드·초점, 스크린 리더 낭독: 하지 못함
- [ ] 실기기(카카오톡 인앱 브라우저·Safari): 하지 못함

## 확인할 항목

- 모션 반복 (확인 필요): Figma 데이터는 2.4초 주기 반복 재생이다. 장식이 계속 깜빡이는 것을 피하려고 한 번만 재생했다. 반복이 의도라면 `iterations`를 바꾼다.
- 소개 문구 폰트 (확정 필요): Noto Sans KR → Pretendard(`typography-body-3-regular`, 14/21, 자간 0).
- 「앱 설치하기」 연결 (반영, #479): 임시 토스트를 없애고 App Store 링크로 바꿨다.
- iOS가 아닌 기기 안내 문구 (확인 필요, #489): 「지금은 iOS 앱만 지원해요.」는 기획 원문이 없다.
- 딤 토큰 (확정): Figma의 `rgba(0,0,0,0.4)`는 `primitive-black-alpha-40`이다. `overlay-dim-subtle`은 `black-alpha-10`이라 쓰지 않았다(처음에 잘못 써서 사진이 밝았음).
- 앱 밖 비로그인 사용자의 막힘 (후속): 브라우저에서는 소셜 로그인을 할 수 없어 「초대장 확인하기」 뒤 로그인 화면에서 막힌다. 앱이 있으면 유니버셜 링크가 앱으로 넘겨 이 화면을 거치지 않고, 없으면 「앱 설치하기」가 경로다(`docs/workflows/invite-link-entry.md`).
