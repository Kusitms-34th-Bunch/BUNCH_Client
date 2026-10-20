# 페이지: 번치 멤버 초대

## 메타데이터

- Route: `/onboarding/create/invite`(`apps/web/src/app/(app)/onboarding/create/invite/page.tsx`)
- Status: UI와 복사·공유 동작 구현됨(브라우저 렌더 대조 결과는 검증 항목). 초대 링크는 API가 없어 임시 값이다. 실기기 검증 전
- 디자인 출처: Figma `Bunch/Invite/Default`(node `791:3364`), `Bunch/Invite/LinkCopied`(node `791:3390`). 화면설계서(node `791:8962`, 진입점 `791:8727`)를 함께 참고했다.

## 목적과 범위

### 포함

- 번치를 만든 뒤 멤버를 초대하는 화면. 구성: 헤더(왼쪽 닫기 X), 제목·설명, 「초대 링크」 라벨과 복사 아이콘, 읽기 전용 링크 입력창, 최대 인원 안내, 하단 「나중에 할게요」.
- 복사 아이콘을 누르면 링크를 클립보드에 복사하고 「초대 링크가 복사되었어요.」 토스트(오른쪽 「공유」 버튼)를 띄운다. 「공유」는 OS 공유 시트(Web Share API)를 연다.
- 완료 화면(`BunchCreated.spec.md`)의 「멤버 초대하기」 카드가 이 화면으로 이동한다.

### 범위 외

- 초대 링크를 만드는 API. 지금은 Figma 예시 값(`fixtures/invite.fixture.ts`의 `inviteLinkFixture`)이다.
- 화면 전환: 완료 → 초대는 SSGOI `slide`(Ease Out·이동 시간 300ms)를 적용하고 뒤로 가기는 반대 방향으로 이동한다. 피드로 나가는 이동에는 전환을 등록하지 않았다. 설정과 검증 범위는 `docs/architecture/motion.md`를 따른다.
- iPhone 상태 바·홈 인디케이터(기기 요소. Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/onboarding/create/invite`. params와 search는 없다.
- 접근 권한·guard: 로그인 접근 조건은 아직 없다. draft를 읽지 않아 입력 순서 가드는 두지 않았다. URL로 바로 열려도 임시 링크가 보인다(링크 API를 붙일 때 번치 식별과 접근 조건을 정한다).
- Layout·redirect·navigation: `create/layout.tsx`의 draft provider 안이고 `(steps)`의 헤더·진행 표시줄 틀 밖이다. `PageShell`을 한 번 쓴다. 완료 화면에서 `router.push`로 들어오며 뒤로 가기는 완료 화면으로 돌아간다(`createdName` 기록, `BunchCreated.spec.md`). 닫기(X)와 「나중에 할게요」는 `router.replace('/')`로 피드(임시 `/`)로 이동해 뒤로 가기로 돌아오지 않는다.

## 상태와 흐름

- 초기 진입: 정적 화면이다. 링크는 props로 받는다.
- Loading·Empty·Error: 링크 요청이 없어 해당 없음. 링크 없음·로딩·오류 상태는 링크 API가 생길 때 정한다.
- Success: 복사 성공 시 토스트 「초대 링크가 복사되었어요.」+「공유」. 토스트는 `toast()`가 띄우며 새 토스트가 이전 것을 대체한다.
- 복사 실패: 클립보드 권한·비보안 컨텍스트로 실패하면 「초대 링크를 복사하지 못했어요.」 토스트를 띄운다(설계서에 없는 문구, 제안).
- 공유: 지원 환경에서만 토스트에 「공유」를 제공하고 `navigator.share({ url })`를 호출한다. 사용자의 취소(`AbortError`)는 안내 없이 종료한다. 그 외 실패는 오류를 수집하고 「공유하지 못했어요. 복사한 링크를 직접 보내주세요.」 토스트를 띄운다. 공유 미지원 환경에서는 복사 성공 안내만 제공한다.

## 데이터 의존성

- Query와 enabled 조건: 없음. Mutation·cache 영향: 없음.
- API 계약 확인 항목: 번치별 초대 링크 발급·조회, 링크 만료·재발급 정책.

## UI와 접근성

- Component mapping: `core`의 `Header`(닫기), `TextField`(readOnly 링크 입력창), `Toast`·`toast()`·`Toaster`(`(app)/layout.tsx`에 한 번 둠). `web`의 `PageHeader`. 복사 아이콘·안내 박스·「나중에 할게요」는 이 화면 전용이다.
- Keyboard·focus·accessible name: 닫기, 「초대 링크 복사」(아이콘 버튼), 링크 입력창(이름 「초대 링크」, 읽기 전용), 「나중에 할게요」. 복사 버튼 터치 영역은 40px이고 아이콘이 Figma 위치에 오도록 음수 여백으로 맞췄다. 토스트의 읽기는 `sonner`의 `aria-live` 영역이 맡는다(`Toast.spec.md`).
- Responsive·긴 텍스트: 링크 입력창은 한 줄이고 넘치면 입력창 안에서 잘린다(읽기 전용이라 전체를 선택해 복사할 수 있다).

| Figma             | 값                                           | 사용한 토큰·utility                                                  |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| 헤더              | 높이 48, 좌우 16                             | `Header`                                                             |
| 제목·설명         | Title-1 22/28, 설명 14/21, 위 12 좌우 16     | `PageHeader`                                                         |
| 링크 영역         | 제목 아래 44, 좌우 16, 항목 간격 6           | `pt-s17 px-padding-p8 gap-s3`                                        |
| 라벨              | Body-2-SemiBold 14/21                        | `typography-body-2-meduim text-text-primary`                         |
| 안내 박스         | `surface-secondary`, radius 6, 16·10, 간격 6 | `bg-surface-secondary rounded-r3 px-padding-p8 py-padding-p5 gap-s3` |
| 「나중에 할게요」 | Body-3 13/18 밑줄, `text-tertiary`           | `typography-body-3-regular text-text-tertiary underline`             |

## 검증

- [x] 관련 test: `BunchInvite.test.tsx`(제목·main, 읽기 전용, 복사→토스트, 공유, 공유 미지원·취소, 복사 실패, 닫기·나중에), `BunchCreated.test.tsx`(초대 이동)
- [x] 브라우저 렌더 대조(headless Chromium, 375×812 iframe): 제목·라벨·링크 입력창·안내 박스·「나중에 할게요」 위치와 크기가 Figma(상태 바 44px 제외)와 1px 이내로 맞고 가로 넘침이 없다. 복사 아이콘은 클립보드 권한이 없는 환경이라 실패 토스트 경로만 확인했고 성공 토스트와 「공유」 버튼은 데스크톱 1280폭에서 확인했다. 픽셀 비교와 실기기는 하지 못함
- [ ] 실기기(iOS WebView)에서 클립보드·공유 시트: 미검증

## 확인할 항목

- 토스트 위치 (확정): Figma는 토스트가 아래에서 82px(홈 인디케이터 34px 제외하면 48px)에 폭을 넓게 펴고 「나중에 할게요」(34px) 위 14px에 놓인다. `toast()`의 `bottomOffset: 32`(기본 Safe Area + 16px에 더함)와 `fullWidth`로 맞췄다(`Toast.spec.md`). 「나중에 할게요」 영역은 Figma처럼 버튼 높이 34px만 둔다. Figma 토스트의 좌우 여백은 왼쪽 19·오른쪽 12로 비대칭이라 목록 폭(좌우 16px)을 썼다.
- 토스트 노출 시간 (확정, 2026-10-19): 설계서의 Toast Interaction대로 3초다(`Toast.spec.md`). 등장 Fade In·Ease Out 200ms, 퇴장 Fade Out·Ease In 200ms는 sonner 기본 전환이라 맞추지 않았다.
- 안내 문구 마침표 (확정 필요): 기본 상태 「…함께할 수 있어요.」, 복사됨 상태 「…초대할 수 있어요」로 다르다. 같은 화면이라면 어느 쪽인지 디자이너 확인. 지금은 기본 상태 문구를 쓴다.
- 링크 값 (미정): 설계서의 기본 상태 입력창은 자리 표시 문구(`reqsaieiei///…`)다. 링크 발급 전 상태를 어떻게 보일지 정해야 한다.
- 닫기·「나중에 할게요」 도착지 (제안): 설계서는 "생성된 번치 홈 화면"이다. 번치 홈이 없어 피드(`/`)로 임시 이동한다.
- 화면 전환 애니메이션 (구현, 실기기 미검증): 완료 화면 → 이 화면은 Slide In·왼쪽·300ms다. 브라우저의 뒤로 가기(스와이프 포함)는 방향 타입이 붙지 않아 방향 전환이 없다(`docs/architecture/motion.md`). 곡선·시간은 `BunchStartSelect.spec.md`의 확인할 항목(설계서와 다름)을 따른다.
