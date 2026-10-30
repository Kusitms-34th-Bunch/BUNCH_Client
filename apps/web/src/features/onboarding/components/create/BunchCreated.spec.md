# 페이지: 번치 생성 완료(번치 만들기 완료 화면)

## 메타데이터

- Route: `/onboarding/create/complete`(`apps/web/src/app/(app)/onboarding/create/complete/page.tsx`)
- Status: UI와 폭죽 애니메이션 구현됨(`next build` 렌더와 375×812 Chromium에서 재생·위치를 확인함). 3단계 「번치 만들기」가 이 화면으로 이동만 하고(생성 요청 없음), 초대 화면 이동과 갤러리 선택·임시 미리보기는 연결됨. 이미지 서버 저장은 미연결. 실기기 검증 전
- 디자인 출처: Figma `Bunch/Create/Success-Celebration`(node `791:3260`, 폭죽이 나오는 시작 상태), `Bunch/Create/Success`(node `791:3345`, 폭죽이 끝난 최종 상태). 화면설계서와 모션 데이터는 받은 JSON(5개 조각의 위치·회전·불투명도 키프레임).

## 목적과 범위

### 포함

- 번치가 만들어졌음을 알리는 화면: 기본 대표 이미지(`BunchAvatar`, 구름 마스코트)+카메라 버튼, 제목 「{번치 이름} 번치가 만들어졌어요!」, 하단 「멤버 초대하기」 카드와 「내 번치로 이동하기」 버튼.
- 진입하면 폭죽 5조각이 1.5초 동안 한 번 재생되고 끝나면 사라진다(최종 상태가 `791:3345`).

### 범위 외

- 번치 생성 요청과 이 화면으로의 이동(3단계 「번치 만들기」가 아직 연결 전).
- 「내 번치로 이동하기」의 실제 도착 화면(번치 홈이 없어 피드 `/`로 임시 이동), 사진 업로드·영구 저장, 서버가 돌려준 번치 정보 표시.

## Route와 접근

- Path·params·search: `/onboarding/create/complete`. params와 search는 없다.
- 접근 권한·guard: 로그인 접근 조건은 아직 없다. 입력 순서 가드는 있다. 1~3단계를 마치지 않고 열면(새로고침·URL 직접 입력) `useCreateBunchGuard`가 화면을 그리지 않고 마치지 못한 첫 단계로 `router.replace`한다. `create/layout.tsx`의 provider 안이라 번치 이름은 입력한 값을 읽어 처음 그릴 때 보관하고, 그 직후 draft를 비운다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다(헤더 없음). 이동 동작은 없다.

## 상태와 흐름

- 진입: 폭죽 조각이 나타나 날아가다 사라진다. 끝나면 조각은 DOM에서 치운다. 화면이 먼저 사라지면 재생을 취소한다.
- 움직임 줄이기(`prefers-reduced-motion: reduce`): 폭죽을 그리지 않는다. 문구·버튼은 그대로다.
- `Element.animate`를 지원하지 않는 환경: 폭죽을 그리지 않는다.
- 「멤버 초대하기」: `/onboarding/create/invite`로 `router.push`한다(`BunchInvite.spec.md`). 「내 번치로 이동하기」: 피드(임시 `/`)로 `router.replace`한다. 카메라: 네이티브 갤러리를 바로 열고 선택 후 현재 화면의 대표 사진을 교체한다. 일반 브라우저에서는 개발용 파일 선택창을 연다.

## 데이터 의존성

- Query·mutation: 없음. 번치 이름은 입력 중이던 임시 상태(`useCreateBunchDraft().name`)를 읽는다. 생성 응답을 받으면 서버 값으로 바꾼다.
- 기본 이미지: `apps/web/public/images/default-bunch.png`(Figma에서 받아 480px로 줄임, 약 140KB).

## UI와 접근성

- Component mapping: `BunchAvatar`(카메라 버튼 포함), `Button`(내 번치로 이동하기), `GraphicPeopleIcon`, 폭죽 `BunchConfetti`(이 feature 안).
- 멤버 초대 카드: Figma는 링크처럼 그린 카드인데 디자인 시스템의 `InviteMemberCard`는 라디오 선택 카드라 의미가 달라 쓰지 않고 같은 모양으로 이 화면에 `button`으로 만들었다(아래 확인할 항목).
- 폭죽: 장식이라 `aria-hidden`이고 포인터 이벤트를 받지 않는다. 위치(`translate`)·회전(`rotate`)·불투명도를 `Element.animate`로 따로 재생해 transform·opacity만 쓴다(`docs/architecture/motion.md`).
- 제목은 `h1`이고 이름과 문구가 줄을 나눠 보인다. 카메라 버튼의 이름은 「사진 변경」이다.

| Figma          | 값                                                           | 사용한 토큰·utility                                               |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| 본문 정렬      | 세로 가운데, 이미지와 제목 간격 24                           | `flex-1 justify-center gap-s12`                                   |
| 제목           | Title-1 SemiBold 22/28 가운데                                | `typography-title-1-semi-bold text-center`                        |
| 멤버 초대 카드 | 패딩 20, radius 14, 아이콘과 글 간격 16, `surface-secondary` | `p-s10 rounded-r7 gap-s8 bg-surface-secondary`                    |
| 카드 글        | 제목 Body-1 Medium, 설명 Body-3 Regular `text-tertiary`      | `typography-body-1-medium` / `body-4-regular`                     |
| 카드와 버튼    | 카드 좌우 16, 버튼 위 10                                     | `px-padding-p8`, `pt-s5`                                          |
| 폭죽 조각      | 23×15, 색 `#26e26a` `#ff86d7` `#fbab22` `#777ff2` `#ff86d7`  | 토큰 없는 장식 색을 인라인 값으로(데이터 `constants/confetti.ts`) |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 정적 페이지로 생성되고 `next start`에서 직접 URL 렌더·재생·종료 후 조각 제거를 확인함. 새로고침·뒤로 가기는 미검증
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증)
- [x] 관련 test: `BunchCreated.test.tsx`(제목, 이름 없음, 버튼), `BunchConfetti.test.tsx`(조각당 3개 재생과 길이, 종료 후 제거, 취소, 움직임 줄이기)
- [x] 실행 command와 결과: `yarn workspace @app/web test`(103개)·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812): 아바타 154×158, 구름 이미지 로드, 카드와 버튼 위치, 250ms 시점 폭죽 위치, 종료 후 조각 0개, 가로 넘침 없음. Figma 정지 화면과 픽셀 비교, 실기기 프레임은 하지 못함

## 확인할 항목

- 폭죽 좌표 (확정): 모션 데이터가 Figma 375×591 틀 기준 절대 좌표라 그 틀의 가운데를 본문(아바타·제목) 가운데에 맞췄다. 아바타와 제목이 고정 크기라 폭을 키우지 않았고, 320·375·430px에서 아바타 중심 기준 조각 위치가 같음을 확인했다(재생 시점 오차 몇 px 안). 폭이 320px보다 좁으면 틀이 잘릴 수 있다. 값은 `useEffect` 안에서 재생하므로 첫 프레임에 조각이 잠깐 보이지 않는다(불투명도 0에서 시작).
- 폭죽 색 (제안): Figma의 장식 색을 토큰 없이 그대로 썼다. 토큰이 생기면 교체한다.
- 모션 값 (확정): 조각 5개의 위치·회전·불투명도를 받은 키프레임 그대로 옮겼다(위치는 100ms 간격 샘플 사이를 직선 보간, 회전과 불투명도 전환은 `cubic-bezier(0.5, 0, 0.5, 1)`). 설계서의 느낌과 비교한 검수는 디자이너 확인.
- 이 화면 진입 연결 (부분 연결): 설계서는 「번치 만들기」 성공 시 이 화면으로 이동이다. 생성 API가 없어 3단계에서 요청 없이 `ONBOARDING_PATHS.createBunchComplete`로 이동만 한다. 요청을 붙일 때 성공 뒤에 이동하도록 바꾸고 요청 중 중복 탭을 막는다.
- 직접 진입 (확정): 입력 단계를 마치지 않고 열면 첫 미완료 단계로 `router.replace`한다. 생성이 없었는데 「번치가 만들어졌어요!」가 보이는 거짓 성공 화면은 이 가드로 막는다. 이 화면으로 가는 경로는 3단계의 「번치 만들기」뿐이다.
- 성공 뒤 입력값 비우기 (확정): 이름을 화면 state로 보관한 뒤 `finish(이름)`으로 입력값을 비우고 마쳤다는 기록(`createdName`)만 남긴다. 3단계는 `router.replace`로 이동해 기록에 남지 않고, 뒤로 가기로 2단계 이전에 돌아가면 가드가 1단계로 보낸다. 초대 화면에서 뒤로 가면 `createdName`이 있어 입력값이 비어 있어도 같은 완료 화면(같은 이름)으로 돌아온다. 중단 모달의 「나가기」(`reset`)와 뒤로 가서 새로 입력을 시작하는 것(입력 setter)도 이 기록을 지워 옛 이름이 새 완료 화면에 나오지 않는다. 완료 화면이 다시 mount되면(초대 화면에서 뒤로 가기) 폭죽이 다시 재생된다(허용, 제안). 생성 API를 연결할 때 이름은 생성 응답 값으로 바꾼다.
- 「멤버 초대하기」 카드 (미정): Figma 코드는 링크(`a`)로 그렸고 도착 화면이 없다. 지금은 눌러도 동작이 없는 `button`이다. 도착 화면이 정해지면 링크로 바꾸고, 같은 모양이 다른 화면에서도 쓰이면 디자인 시스템 컴포넌트로 올릴지 정한다.
- 「내 번치로 이동하기」 (미정): 도착 화면(내 번치)이 없어 동작이 없다.
- 사진 선택 (부분 연결): `usePhotoPicker`가 `pickGalleryImage` 브리지를 호출한다. 앱은 사진 한 장 선택·시스템 정사각형 편집 후 JPEG data URL(최대 약 4MiB)을 반환한다. 웹 개발 fallback은 3MiB 이하 JPEG·PNG·WebP를 파일 input으로 읽고 디코딩 확인 후 표시한다(별도 편집 UI 없음). 취소·실패 시 기존 사진 유지, 선택 중 재호출 방지, 결과는 상태 영역으로 안내한다. 업로드 API·번치 ID가 없어 현재 mount 동안만 미리 보이며 화면 이탈 시 사라진다. 임시 미리보기 안내는 사진이 있는 동안 유지한다. 서버 저장·메타데이터 제거 책임과 로그인 명세의 원형 가이드 편집은 후속 연결 사항이다.
- 기본 이미지 (제안): `BunchAvatar`가 `<img>`를 쓰고 `src`를 문자열로 받아 `next/image` 최적화를 쓰지 않는다(`docs/workflows/performance.md`). 크기를 줄여 두었으나 필요하면 `next/image` 연동을 검토한다.
- 제목 색 (확정): Figma의 첫 줄(번치 이름)은 `#121212`(`text-primary`), 둘째 줄 「번치가 만들어졌어요!」는 `#111318`이다. `#111318`은 토큰에 없어(가장 가까운 `gray-900`은 `#121212`) 둘째 줄에 `text-[#111318]`로 그대로 썼다. 육안으로는 구분되지 않는 차이라 디자이너가 의도한 값인지 확인하고 토큰이 생기면 교체한다.
- 포커스 윤곽선 (확정, 예외): 「멤버 초대하기」 카드에 `focus-visible` 윤곽선(2px `border-brand`)을 두었다. Figma에는 없지만 저장소 공통 방식이고 `BunchAvatar` 카메라 버튼과 같다.
- WebView 지원 (미검증): 폭죽이 `translate`·`rotate` 개별 CSS 속성을 Web Animations API 키프레임에 쓴다. 최근 브라우저는 지원하지만 mobile-shell WebView 버전에서의 동작은 실기기로 확인하지 못했다. 미지원이면 조각이 모서리에서 불투명도만 바뀐다.
- 긴 이름·큰 글꼴 (미검증): 이름은 최대 12자지만 375px 폭의 줄바꿈·넘침과 큰 글꼴에서 하단 CTA와 본문 높이는 확인하지 못했다.
- 완료 안내 (미정): 이동한 뒤 스크린 리더가 완료를 알 수 있도록 제목으로 초점을 옮기거나 알리는 방식은 라우팅 포커스 정책과 함께 연결할 때 정한다.
