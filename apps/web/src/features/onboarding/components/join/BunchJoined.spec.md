# 페이지: 번치 참여 완료

## 메타데이터

- Route: `/onboarding/join/complete`(`apps/web/src/app/(app)/onboarding/join/complete/page.tsx`)
- Status: UI 구현됨(headless Chromium에서 Figma 값을 대조함). 참여 요청 응답의 번치 이름·대표 이미지를 보여 준다(이슈 #308). 실서버 검증 전, 실기기 검증 전
- 디자인 출처: Figma `Bunch/Join/Success`(node `791:3089`). 화면설계서(node `791:9342`)를 함께 참고했다.

## 목적과 범위

### 포함

- 참여에 성공한 뒤 보는 화면: 대표 이미지(167px 원), 「{번치 이름}에 합류했어요!」, 「이제 함께한 순간을 같이 기록할 수 있어요.」, 컨페티 한 번(`BunchConfetti`, 4.2초, 번치 만들기 완료와 같은 연출. Figma `6163:189892`), 하단 「번치로 이동하기」.
- 닫기(X)와 「번치로 이동하기」는 피드(임시 `/`)로 이동한다. 설계서의 도착지는 "참여한 번치의 메인 화면"이다.

### 범위 외

- 참여 요청(`BunchJoinInvitation.spec.md`). 이 화면은 그 응답으로 받은 번치(`JoinInvitationProvider.joinedBunch`)를 읽기만 한다.
- 번치 메인 화면(없음).

## Route와 접근

- Path·params·search: `/onboarding/join/complete`. params·search는 없다.
- 접근 권한·guard: 참여한 번치(`joinedBunch`)가 없으면(직접 진입·새로고침) 화면을 그리지 않고 링크 입력으로 `router.replace`한다. 참여하지 않았는데 「합류했어요!」가 보이는 거짓 성공 화면을 막는다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 닫기·「번치로 이동하기」는 `router.replace`로 이동한다.

## UI와 접근성

- Component mapping: `core`의 `Header`(닫기, `HeaderIconButton`), `Button`. 이미지는 서버가 돌려준 외부 주소라 `<img>`(167px 원, 장식이라 `alt=""`, `next/image` 최적화를 쓰지 않음)이고 크기·모양은 `InviteCard`의 이미지와 같다(토큰 없는 167px). 폭죽은 `components/BunchConfetti`(공용, `prefers-reduced-motion`이면 그리지 않는다).
- Keyboard·focus·accessible name: 닫기, 「번치로 이동하기」. 제목 `h1`에 번치 이름이 들어간다.
- Responsive·긴 텍스트: 제목·안내는 가운데 정렬이고 단어 단위로 줄바꿈한다(`break-keep`).

| Figma            | 값                                             | 사용한 토큰·utility                    |
| ---------------- | ---------------------------------------------- | -------------------------------------- |
| 이미지           | 167 원                                         | `size-41.75 rounded-full`              |
| 이미지와 글 간격 | 20                                             | `gap-s10`                              |
| 제목             | Title-1-SemiBold 22/28, `text-primary`         | `typography-title-1-semi-bold`         |
| 안내             | Body-1-Medium 16/24, `text-tertiary`, 제목과 6 | `typography-body-1-medium gap-s3`      |
| 본문 아래        | 40                                             | `pb-padding-p18`                       |
| 하단 버튼        | 48, 위 10 좌우 16                              | `Button` `pt-padding-p5 px-padding-p8` |

## 검증

- [x] 관련 test: `BunchJoined.test.tsx`(제목·안내·main, 장식 이미지, 닫기·이동), `BunchConfetti.test.tsx`
- [x] headless Chromium(프로덕션 빌드): 이미지 167, 제목 22/600, 안내 16/500 `#535a61`, 이미지와 제목 간격 20, 버튼 48, 폭죽 조각 렌더(이전 연출 기준), 「번치로 이동하기」→ `/`
- [ ] 컨페티를 앱 화면에서 대조: 새 Figma 모션(16개)을 번치 만들기 완료 화면과 같은 컴포넌트로 재사용했고, 키프레임 재생만 Chromium에서 확인했다. 이 화면의 이미지 위치(167 원)에 맞춘 위치 보정은 하지 않았다(미검증)
- [ ] 실기기: 미검증

## 확인할 항목

- 브라우저·기기 뒤로 가기 (허용, 설계서와 다름): 설계서는 뒤로 가기를 피드로 보내지만 「참여하기」가 `replace`로 이동해 기록이 `[입력, 완료]`라 브라우저 뒤로 가기는 링크 입력 화면으로 간다. 거기서 같은 링크를 다시 확인하면 서버가 `ALREADY_MEMBER`로 알려 토스트 뒤 번치로 이동하므로 재참여는 생기지 않는다.
- 복구 경로: 이 화면에서 나갈 수 있는 곳은 피드(`/`)뿐이다.
- 거짓 성공 흐름 (해소): 참여한 번치(`joinedBunch`)가 없으면 화면을 그리지 않고 링크 입력으로 되돌려, 참여하지 않았는데 완료 화면이 뜨는 일이 없다.
- 닫기(X) 아이콘 (확인): 설계서 본문은 "상단 뒤로가기"인데 Figma는 X 아이콘이다. Figma 값(X, 「닫기」)을 썼다. 도착지는 둘 다 피드다.
- 도착지 (임시): 「번치로 이동하기」는 피드 탭(`/feed`)이다. 번치 메인 화면으로 바꿀지 확인한다.
