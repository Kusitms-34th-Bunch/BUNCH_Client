# 페이지: 번치 소개 작성(번치 만들기 2단계)

## 메타데이터

- Route: `/onboarding/create/description`(`apps/web/src/app/(app)/onboarding/create/description/page.tsx`)
- Status: UI와 입력 규칙 구현됨(`next build` 렌더를 Figma 값과 측정으로 대조함). 「다음」은 3단계(`BunchMood.spec.md`)로 이동하고 헤더 뒤로 가기는 중단 확인 모달을 연다. 실기기 검증 전
- 디자인 출처: Figma `Bunch/Create/Description`(node `791:2994` 빈 입력, `791:3022` 입력됨). 화면설계서(node `791:8480`)를 함께 참고했다.

## 목적과 범위

### 포함

- 번치를 한 줄로 소개하는 2단계의 UI와 입력 규칙.
- 구성: 헤더(왼쪽 뒤로 가기), `Stepper`(3단계 중 2단계), 제목 「번치를 소개해주세요」, 한 줄 소개 입력(`LabeledTextArea`, 최대 50자), TIP 영역(배지 + 「이런 소개는 어때요?」 + 예시 3개), 하단 「이전」·「다음」.
- 소개를 입력하면 「다음」이 활성화된다. TIP 영역은 입력과 관계없이 항상 보인다(설계서 4번).

### 범위 외

- 번치 생성 API, 소개 문구의 서버 검증.
- 단계 사이 제목·본문 애니메이션. 화면설계서 `791:8480`의 「진행바만 인터랙션 O」에 따라 진행 표시줄 색상만 CSS ease-out·300ms로 전환한다. 공통 `CreateBunchFrame`이 진행바를 유지한다.

## Route와 접근

- Path·params·search: `/onboarding/create/description`. params와 search는 없다.
- 접근 권한·guard: 로그인 접근 조건은 아직 없다(로그인 미구현, 확인할 항목). 입력 순서 가드는 있다. 입력값은 `create/layout.tsx`의 provider가 보관하므로 새로고침·URL 직접 입력으로 1단계(이름·공개 범위)를 거치지 않고 열면 `useCreateBunchGuard`가 화면을 그리지 않고 `ONBOARDING_PATHS.createBunch`로 `router.replace`한다. 처음 그릴 때만 판정한다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 「다음」은 `router.push`, 「이전」은 `router.back()`이고 헤더 뒤로 가기는 중단 확인 모달을 연다.

## 상태와 흐름

- 초기 진입: 소개는 비어 있고 「다음」은 비활성이며 글자 수는 `0/50`이다. 1단계에서 돌아온 경우에는 이미 쓴 소개가 남아 있다.
- 입력 중: 입력할 때마다 글자 수가 바뀌고, 길어지면 줄바꿈되며 입력창 높이가 늘어난다. 50자를 넘겨서는 입력되지 않는다. Enter로 줄을 바꿀 수 없고 붙여넣은 줄바꿈은 공백으로 바뀐다.
- 활성: 공백을 뺀 소개가 1자 이상이면 「다음」이 활성화된다. 공백만 입력하면 비활성이다.
- 오류: 설계서에 오류 상태와 허용 문자 제한이 없어 구현하지 않았다.
- Success·완료 후 이동: 「다음」은 `/onboarding/create/mood`(3단계)로 이동한다. 「이전」은 이전 화면(1단계)으로 돌아가고, 헤더 뒤로 가기는 중단 확인 모달을 연다.

## 데이터 의존성

- Query와 enabled 조건: 없음.
- Mutation·cache 영향: 없음.
- API 계약 확인 항목: 번치 생성 요청의 소개 필드와 길이 제한(50자) 일치.

## UI와 접근성

- Component mapping: `CreateBunchFrame`(헤더·진행 표시줄, `BunchBasicInfo.spec.md`), `PageHeader`(제목만), `LabeledTextArea`(한 줄 소개), `Badge`(`size="sm"`, TIP), `Button`(`secondary` 이전 / `primary` 다음).
- Keyboard·focus·accessible name: 소개 입력은 보이는 라벨 「한 줄 소개」로 이름을 얻고 글자 수는 입력창 설명으로 연결된다. TIP 영역은 `h2`와 목록이라 구조로 읽힌다. 「다음」은 비활성일 때 native `disabled`다.
- Responsive·긴 텍스트·overflow: 입력창은 줄바꿈되고 높이가 늘어난다. 375px에서 가로 넘침이 없다.

| Figma          | 값                                                                         | 사용한 토큰·utility                           |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| 소개 입력 영역 | 위 36, 좌우 16                                                             | `pt-s15 px-padding-p8`                        |
| TIP 영역       | 위 36, 배지와 제목 간격 6, 박스까지 8                                      | `pt-s15 px-padding-p8 gap-s4`, `gap-s3`       |
| TIP 배지       | 7×3 패딩, 12/16 Medium, `chip-blue`                                        | `Badge size="sm"`                             |
| 예시 박스      | 패딩 16, radius 8, `surface-secondary`, 13/18 `text-tertiary`, 목록 간격 4 | `p-s8 rounded-r4 bg-surface-secondary gap-s2` |
| 목록 들여쓰기  | 19.5                                                                       | `ms-[19.5px]`(토큰 없음)                      |
| 하단 버튼      | 위 10, 좌우 16, 간격 10, 「이전」 88px                                     | `pt-s5 px-padding-p8 gap-s5`, `w-22`          |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 정적 페이지로 생성되고 `next start`로 1단계 → 2단계 → 「이전」 → 1단계 입력 유지 → 다시 2단계 소개 유지를 확인함. 새로고침은 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증, 확인할 항목)
- [x] 상태별 UI: 빈 입력, 입력됨(줄바꿈), 다음 활성·비활성
- [x] 관련 test: `BunchDescription.test.tsx`(제목·진행 표시, 글자 수, 길이 제한, 다음 활성 조건, Enter 차단, 이전·뒤로 가기, TIP, 단계 사이 입력 유지)
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 진행 표시·제목·라벨·입력창·글자 수·TIP 배지·박스·버튼 위치와 크기를 Figma와 대조(상태 바 44px 제외). 실기기와 픽셀 비교는 하지 못함

## 확인할 항목

- 2단계 직접 진입 (확정): 1단계의 이름·공개 범위가 비어 있으면 1단계로 `router.replace`한다(`useCreateBunchGuard`). 생성 요청을 붙일 때 제출 직전 검증은 서버 쪽에서도 따로 한다.
- 뒤로 가기·이전 (확정, 설계서대로): 헤더 뒤로 가기는 설계서대로 중단 확인 모달을 연다(`BunchBasicInfo.spec.md`). 「이전」은 설계서가 "1단계로 이동"이지만 이전 화면으로 돌아간다(`router.back()`). 이 화면을 URL로 직접 열었다면 「이전」이 1단계가 아니라 브라우저 이전 기록으로 나가고, 이전 기록이 없으면 동작이 없을 수 있다.
- 글자 수 최대치 (확정): 50자. 설계서 목업의 `0/30`은 오기로 본다.
- 입력 조건 (제안): 「다음」 활성 조건을 공백 제외 1자 이상으로 했다. 설계서는 "입력 조건 충족 시"만 적었다. 기획 확인.
- 줄바꿈 (제안): 한 줄 소개라 Enter를 막았다(한글 조합 확정 Enter는 막지 않고 모바일 키보드에는 `enterKeyHint="done"`). 설계서에 없는 동작이다. 막은 이유를 화면에 알리지는 않는다(보이는 안내는 디자이너 협의). 기획 확인.
- 소개 예시 (확정): 설계서 4번의 고정 문구 3개를 그대로 쓴다.
- 입력 포커스 표시 (확정): 포커스 시 1px 테두리가 `border-strong` 색상(#25282d)으로 바뀌고 안내 문구를 숨긴다. 포커스 해제 시 기본 테두리로 돌아간다(`LabeledTextArea.spec.md`).
- 「다음」 비활성 사유 (미정): 비활성일 때 이유를 알리는 보이는 안내가 Figma에 없다. 포커스에서 빠지는 native `disabled`와 함께 접근성 개선 후보이며 디자이너 협의 대상이다.
- 제목 색 (제안): Figma가 `black`(변수 없음)이고 구현은 `text-primary`(#121212)다. 디자이너 확인.
