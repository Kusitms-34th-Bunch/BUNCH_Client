# 페이지: 초대 확인(번치 참여 여부)

## 메타데이터

- Route: `/onboarding/join/invitation`(`apps/web/src/app/(app)/onboarding/join/invitation/page.tsx`)
- Status: UI와 이동·중단 모달 구현됨(headless Chromium에서 흐름 전체를 클릭으로 확인함). 참여 요청 API가 없어 요청 없이 이동만 한다. 실기기 검증 전
- 디자인 출처: Figma `Bunch/Join/Invitation`(node `791:3050`), 긴 소개(`875:5962`), 중단 모달(`791:13839`). 화면설계서는 `온보딩_번치 참여`(node `791:9342`)의 ②③④.

## 목적과 범위

### 포함

- 초대받은 번치의 정보를 `InviteCard`(번치 이름·소개·대표 이미지·「From. 민지 님」·「참여하기」)로 보여 주고 참여할지 묻는다. 제목 「초대받은 번치에 참여할까요?」.
- 「참여하기」는 참여 완료 화면(`BunchJoined.spec.md`)으로 이동한다. 처리 중 중복 탭은 막는다.
- 뒤로 가기는 중단 확인 모달(「번치 참여를 그만둘까요?」, 「나가기」·「계속 참여하기」)을 연다. 「나가기」는 피드로 이동한다.

### 범위 외

- 번치 정보(이름·소개·이미지·초대한 사람) 조회와 참여 요청 API. 지금은 `fixtures/join.fixture.ts`의 예시 값을 route가 넘긴다.
- 참여 요청 실패(이미 참여함·인원 초과 등) 화면. Figma에 없다.

## Route와 접근

- Path·params·search: `/onboarding/join/invitation`. params·search는 없다.
- 접근 권한·guard: 아직 없다. URL로 바로 열려도 예시 번치가 보인다(API가 생기면 초대 링크로 번치를 식별한다).
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 배경은 연보라(`bg-surface-brand-subtle-1`, `PageShell`의 `className`). 「참여하기」와 「나가기」는 `router.replace`로 이동해 뒤로 가기로 돌아오지 않는다.

## 상태와 흐름

- 초기 진입: 정적 화면이다(예시 값을 props로 받는다). 로딩 화면의 연보라 배경에서 이어지므로 제목·카드만 투명도 0→1로 300ms 동안 나타난다(위치 이동은 넣지 않는다. 내용 래퍼가 `main` 높이와 같아 이동분만큼 스크롤 바가 잠깐 생긴다)(`globals.css`의 `page-content-in`, 동작 줄이기에서는 없음).
- 「참여하기」: `router.replace('/onboarding/join/complete')`. 이미 눌렀으면 무시한다. 요청이 없어 성공으로 간주해 이동한다(아래 확인할 항목).
- 소개가 길면 2줄에서 말줄임(`InviteCard`의 `line-clamp-2`, Figma `875:5962`).

## UI와 접근성

- Component mapping: `core`의 `Header`(뒤로 가기, 배경 투명), `web`의 `InviteCard`. 제목은 이 화면 전용 `h1`(Title-1-Bold 24/31, 가운데). 중단 모달은 feature 공용 `ExitFlowDialog`다.
- Keyboard·focus·accessible name: 뒤로 가기, 「참여하기」(카드 안). `InviteCard`는 `article`(이름은 번치 이름)이고 번치 이름이 `h2`다. 모달은 첫 초점이 「계속 참여하기」다.
- Responsive·긴 텍스트: 카드 폭은 화면 폭에서 좌우 40px를 뺀 값(375에서 295)이다.

| Figma     | 값                                 | 사용한 토큰·utility                                                                       |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| 배경      | `#f1f2ff`                          | `bg-surface-brand-subtle-1`(토큰이 `develop`의 PR #60으로 `bunch-50`이 되어 Figma와 같다) |
| 제목      | Title-1-Bold 24/31, 카드와 간격 20 | `typography-title-1-bold gap-s10`                                                         |
| 카드      | 295 폭, 위 40·아래 16, radius 16   | `InviteCard`                                                                              |
| 본문 영역 | 가운데 정렬, 아래 40               | `justify-center px-padding-p18 pb-padding-p18`                                            |

## 검증

- [x] 관련 test: `BunchJoinInvitation.test.tsx`(제목·카드, 참여하기 이동과 중복 탭, 모달 열기·계속·나가기), `InviteCard.test.tsx`(말줄임)
- [x] headless Chromium(프로덕션 빌드): 배경 `#f1f2ff`, 제목 24/700, 이미지 167, 버튼 48, 헤더 투명을 확인하고 입력 → 로딩 → 이 화면 → 완료 화면 흐름을 클릭으로 확인함
- [x] 모달 버튼(headless Chromium): 「나가기」·「계속 참여하기」가 Figma(`791:13887`)와 같은 135.5×48px이고 글자가 잘리지 않는다. `Button` 라벨은 안쪽 여백 안에서 자르는데 Figma 글자는 여백까지 번져, 두 버튼의 좌우 여백을 12px로 줄였다(`ExitFlowDialog`). 큰 글꼴에서는 다시 잘릴 수 있다(미검증).
- [ ] 실기기와 모달 초점 복원: 미검증

## 확인할 항목

- 소개 말줄임의 접근성 한계 (설계서대로): 긴 소개는 2줄에서 말줄임되고(Figma `875:5962`) 전체를 보는 방법이 없다(스크린 리더는 전체를 읽는다). 참여 여부를 정하는 화면이라 판단 근거가 줄 수 있어, 「더보기」를 둘지 줄 수 제한을 풀지 디자이너와 협의한다.
- 「참여하기」 중복 탭 (한계): 처리 중 두 번째 탭은 말없이 무시되고 비활성·진행 표시가 없다. 지금은 `replace`가 즉시라 영향이 없고, 참여 API가 붙어 응답이 느려지면 `disabled`·`aria-busy`·로딩 표시를 넣는다.
- 화면 제목(document title) (확인): 참여 route 4개가 앱 기본 제목을 공유한다. 자동 이동 뒤 화면 전환 단서가 약할 수 있어 페이지별 `metadata`가 필요한지 정한다(번치 만들기 route도 같다).
- 직접 진입·새로고침 (임시): 입력·로딩을 거치지 않고 열어도 예시 번치가 보이고 새로고침도 같다. API가 생기면 초대 링크로 번치를 식별하고, 없으면 입력 화면으로 되돌린다.
- 브라우저·기기 뒤로 가기 (미구현): 설계서는 뒤로 가기를 중단 모달로 받지만 모달은 헤더 뒤로 가기 버튼에만 연결돼 있다. 브라우저 뒤로 가기는 모달 없이 입력 화면으로 간다(입력값은 사라진다). 모바일 쉘의 하드웨어 뒤로 가기 처리 때 다시 정한다.
- 거짓 성공 흐름 (확정 필요): 참여 요청이 없는데 「참여하기」가 완료 화면으로 이동한다. API 연결 전에는 노출하지 않거나 PR 본문에 알린다.
- 모달 취소 버튼 글자 (확정, 2026-10-19, 사용자 확인): 「계속 참여하기」다(Figma `791:13839`). 설계서 본문의 「계속 만들기」는 만들기 흐름 문구가 남은 것이고 입력 화면(`BunchJoin`)의 모달도 같게 맞췄다.
- 모달 모션 (확정, 2026-10-19, 사용자 결정): 화면설계서의 Move in ↑·Ease in·300ms를 따르지 않고 지금 구현(중앙 확대+페이드)을 쓴다. 번치 만들기 모달과 같은 구현이다(`ExitFlowDialog`).
- 대표 이미지 (임시): 기본 이미지(`/images/default-bunch.png`)를 쓴다. 번치별 이미지는 API로 받는다.
- 보낸 사람 이름 길이 (미정): `InviteCard`가 한 줄 고정이라 긴 이름이 넘칠 수 있다(`InviteCard.spec.md`).
