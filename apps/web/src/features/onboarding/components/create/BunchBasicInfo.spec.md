# 페이지: 번치 기본 정보 설정(번치 만들기 1단계)

## 메타데이터

- Route: `/onboarding/create`(`apps/web/src/app/(app)/onboarding/create/page.tsx`)
- Status: UI와 입력 규칙 구현됨(`next build` 렌더를 Figma 값과 측정으로 대조함). 「다음」은 2단계(`BunchDescription.spec.md`)로 이동하고 헤더 뒤로 가기는 중단 확인 모달(`ExitFlowDialog`)을 연다. 실기기 검증 전
- 디자인 출처: Figma `Bunch/Create/BasicInfo`(node `791:2868` 빈 입력, `791:2892`·`874:5460` 입력됨, `875:5539` 오류). 화면설계서는 `온보딩_02`(node `791:8338`).

## 목적과 범위

### 포함

- 번치를 새로 만들 때 번치 이름과 공개 범위(비공개/공개)를 정하는 첫 단계의 UI와 입력 규칙.
- 구성: 헤더(왼쪽 뒤로 가기), `Stepper`(3단계 중 1단계), 제목 「어떤 번치를 만들까요?」, 번치 이름 입력(`LabeledTextField`), 공개 범위(`VisibilityOption` 2개), 하단 「다음」 버튼. 입력값은 `useCreateBunchDraft`로 읽고 쓴다.
- 번치 이름은 영문·한글·숫자만 쓸 수 있고 최대 12자다. 이름과 공개 범위를 모두 정하면 「다음」이 활성화된다.

### 범위 외

- 번치 생성 API와 3단계 화면. 입력값을 서버로 보내는 방법(2단계까지의 입력은 create layout의 임시 상태에 보관한다).
- 홈(피드) 화면. 「나가기」가 이동하는 `ONBOARDING_PATHS.feed`는 현재 `/`다(아래 확인할 항목).
- 화면 전환 애니메이션(`BunchStartSelect.spec.md`의 확인할 항목), 중복 이름 확인 같은 서버 검증. 진행 표시줄 전환은 구현했다(진행 표시줄이 단계 공통 틀에 남아 있다).

## Route와 접근

- Path·params·search: `/onboarding/create`. params와 search는 없다.
- 접근 권한·guard: 아직 없다(로그인 미구현, 확인할 항목). 시작 선택 화면(`/onboarding`)의 「새 번치 만들기」가 이 경로로 이동한다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 「다음」은 `router.push`로 이동하고 redirect는 없다.

## 상태와 흐름

- 초기 진입: 이름은 비어 있고 공개 범위는 선택되지 않았으며 「다음」은 비활성이다. 글자 수는 `0/12`다.
- 입력 중: 입력할 때마다 글자 수가 바뀐다. 12자를 넘겨서는 입력되지 않는다.
- 한글 입력: 한글 IME가 조합 중 값에 넣는 자모(ㅎ 등)는 조합이 끝나기 전까지 오류로 보지 않는다(`onCompositionStart`·`End`). 조합이 끝났는데 단독 자모가 남으면 오류다. 실제 IME 입력은 확인하지 못했다(미검증).
- 오류: 영문·한글·숫자 이외의 문자(특수문자, 공백 포함)가 있으면 「특수문자를 제외한 영문, 한글만 사용할 수 있어요.」를 보여 주고 「다음」은 비활성이다. 문자를 지우면 안내가 사라진다.
- 활성: 이름이 1자 이상이고 오류가 없으며 공개 범위가 선택되면 「다음」이 활성화된다.
- 새로고침·뒤로 가기: 이름과 공개 범위는 `create/layout.tsx`의 임시 상태(`CreateBunchDraftProvider`)에 있어 2단계에서 돌아와도 유지된다. 새로고침하거나 이 흐름(`/onboarding/create` 아래)을 벗어났다 돌아오면 초기화된다(영속 보존 방식은 미정).
- Success·완료 후 이동: 「다음」은 `/onboarding/create/description`(2단계)으로 이동한다. 헤더의 뒤로 가기는 이동하지 않고 중단 확인 모달을 연다. 모달의 「나가기」는 입력값을 모두 비우고 피드로 `router.replace`하며, 「계속 만들기」·ESC는 모달만 닫는다.

## 데이터 의존성

- Query와 enabled 조건: 없음.
- Mutation·cache 영향: 없음(생성 API 연결은 후속).
- API 계약 확인 항목: 번치 생성 요청의 필드(이름, 공개 범위 값)와 이름 중복 오류 응답.

## UI와 접근성

- Component mapping: `CreateBunchFrame`(`(steps)/layout.tsx`가 1~3단계에 한 번 씌우는 틀: `Header`의 뒤로 가기가 `ExitFlowDialog`를 열고 `Stepper`가 단계 사이에 남는다), `PageHeader`(제목만), `LabeledTextField`(번치 이름), `fieldset`·`legend`+`VisibilityOption`(공개 범위), `Button`(다음).
- Keyboard·focus·accessible name: 번치 이름 입력은 보이는 라벨로 이름을 얻고 오류는 `aria-invalid`와 안내 문구로 읽힌다. 공개 범위는 「공개 범위」 `legend`의 라디오 그룹이라 방향키로 선택을 옮긴다. 「다음」은 비활성일 때 native `disabled`다.
- Responsive·긴 텍스트·overflow: 입력창과 카드는 `w-full`이고 좌우 16px다. 375px에서 가로 넘침이 없고 본문이 길어지면 스크롤한다.

| Figma          | 값                                      | 사용한 토큰·utility                              |
| -------------- | --------------------------------------- | ------------------------------------------------ |
| 진행 표시·제목 | `PageHeader`(Stepper 4px, 제목 22/28)   | `PageHeader`                                     |
| 이름 입력 영역 | 위 36, 좌우 16                          | `pt-s15 px-padding-p8`                           |
| 공개 범위 영역 | 위 36, 제목과 카드 간격 12, 카드 간격 8 | `pt-s15 px-padding-p8`, `legend pb-s6`, `gap-s4` |
| 하단 버튼      | 위 10, 좌우 16, 높이 48                 | `pt-s5 px-padding-p8`, `Button`                  |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 `/onboarding/create`가 정적 페이지로 생성되고 `next start`로 렌더를 확인함. 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증, 확인할 항목)
- [x] 상태별 UI: 빈 입력, 입력됨, 오류, 다음 활성·비활성
- [x] 관련 test: `BunchBasicInfo.test.tsx`(제목·진행 표시, 글자 수, 길이 제한, 다음 활성 조건, 이동 경로, 오류와 해제, 공개 범위 그룹)
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 진행 표시·제목·라벨·입력창·글자 수·오류 문구·공개 범위·카드·버튼 위치와 크기·글자 스타일을 Figma와 대조(상태 바 44px 제외). 실기기와 픽셀 비교는 하지 못함

## 확인할 항목

- 노출 전 선행 조건 (확정 필요): 2단계 이후(3단계 `/onboarding/create/mood`)는 UI와 완료 화면 이동은 있고 「번치 만들기」의 생성 요청은 연결되지 않았다. 시작 화면의 「새 번치 만들기」가 이 흐름을 가리키므로 UT·배포에 노출하기 전에 `BunchMood.spec.md`의 연결 항목을 끝낸다.
- 공개 범위 기본 선택 (확정 필요): Figma의 「입력됨」 화면은 공개 범위가 선택되지 않은 채 「다음」이 활성이다. 화면설계서는 "이름과 공개 범위 조건을 충족하면 활성"이라 둘 다 필요로 구현했다. 기본 선택값이 있는 건지 확인.
- 허용 문자 (확정): 영문·한글·숫자(사용자 확인). Figma 오류 문구는 숫자를 언급하지 않아 문구와 어긋난다(`docs/specs/login-signup.md` 확인 항목 9와 같은 건). 공백 허용 여부는 정해지지 않아 오류로 처리했다.
- 최대 길이 (확정): 12자. Figma 빈 상태의 `0/8`은 오기로 본다(사용자 확인).
- 뒤로 가기 (확정, 설계서대로): 3단계 화면설계서(`온보딩_04`)의 주석 "이 앞단 화면까지 다 해당 모달로 통일"과 1·2단계 설계서에 따라 1~3단계 헤더 뒤로 가기는 모두 중단 확인 모달을 연다. 이전 결정(이전 화면으로 `router.back()`)은 이 기준으로 대체했다. 모달 동작은 `BunchMood.spec.md`를 따른다.
- 오류 문구 색 (확정): 토큰 `system-fail-text`(`red-500`, #f04d29)를 쓴다. 흰 배경 대비가 약 3.8:1이라 일반 글자 AA 기준(4.5:1)에는 못 미쳐 디자이너 확인이 필요하다(`LabeledTextField.spec.md`).
- 제목·소제목 색 (제안): 「공개 범위」 소제목은 Figma가 `black`(변수 없음)이고 구현은 `text-primary`(#121212)다. 디자이너 확인.
- 다음 단계로 값 전달 (결정): 단계 사이는 `create/layout.tsx`의 `CreateBunchDraftProvider`(React context)가 이름·공개 범위·소개를 보관한다. 서버 전송과 새로고침 보존은 3단계 이후에 정한다.
