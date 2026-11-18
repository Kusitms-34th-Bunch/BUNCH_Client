# 페이지: 약관 원문

## 메타데이터

- Route: `/signup/terms/[termId]`(`apps/web/src/app/(app)/signup/terms/[termId]/page.tsx`). `termId`는 `service`(서비스 이용약관)·`privacy`(개인정보 수집 및 이용 동의)·`demographics`(추가 개인정보 수집 및 이용 동의). 화면 틀은 Figma `5878:77323`·`5878:77344`·`6372:43752`이고, 본문은 약관 최종본 버전 1.0(2026. 11. 18 시행, #447)이다. 원문의 최종 수정일은 보이지 않고, 버전은 원문의 「v1.0」 대신 「버전 1.0」으로 보인다(사용자 결정)
- Status: UI 구현됨(화면 틀은 `next build` 결과를 Figma 값과 측정으로 대조함). 원문은 최종본이고 실기기 검증 전
- 디자인 출처: Figma `서비스 이용약관`(node `916:7802`), `개인정보 처리방침`(node `916:7823`). 화면설계서(node `916:7706`·`916:7727`). 기능 spec은 `docs/specs/login-signup.md`(1.3.2, 기능명세서 1110판 2026-11-10 기준).

## 목적과 범위

### 포함

- 약관 동의 화면의 약관 행 오른쪽 버튼으로 여는 약관 원문 화면. 앱 안 화면으로 열고 닫아도 동의 화면의 체크 상태가 유지된다.
- 구성: 헤더(뒤로 가기·약관 이름), 시행일자·버전, 머리말(있는 문서만), 조항(제목 + 본문). 본문은 문단(「①」 항 번호는 원문 글자 그대로), 번호 목록, 글머리 목록(한 단계 하위 목록 포함), 조항 안 소제목, 링크(이메일·웹 주소. 전화번호는 원문대로 글자)로 이뤄진다. 부칙·문의처도 조항과 같은 모양이다.
- 원문은 쓰는 곳에 따라 나뉜다. 가입은 서비스 이용약관·개인정보 수집 및 이용 동의·추가 개인정보 수집 및 이용 동의 3개, MY는 서비스 이용약관·개인정보 처리방침(MY 전용)과 「전문보기」의 추가 개인정보 수집 및 이용 동의다. 원문 데이터는 `constants/termsDocuments/`에 문서별 파일로 두고, 가입 route는 `SIGNUP_TERMS_DOCUMENT_IDS`만, MY route는 주소 → 문서 표(`privacy` → `privacyPolicy`)로 고른다.
- 헤더는 상단 고정이고 본문만 스크롤된다.
- MY의 약관 화면(`/my/terms/[termId]`, #235, 화면 설계서 MY(4) 1·2번, Figma `4096:75887`·`4096:75908`)도 같은 컴포넌트를 쓴다. MY Figma는 헤더에 뒤로 가기만 있어 `hideTitle`로 약관 이름을 화면 밖 `h1`로 둔다(이름은 보조기술에 그대로 전달). MY의 `/my/terms/privacy`는 가입용 수집 동의서가 아니라 개인정보 처리방침 문서를 보여 주고, 처리방침의 문서 id(`privacyPolicy`)를 주소로 쓰면 404다. 뒤로 가면 약관 및 개인정보(`/my/terms`)로 돌아가고, 약관 및 개인정보 ↔ 약관 원문은 메뉴 하위 화면과 같은 미는 slide다(전환 경계 고정 id `/my/terms/document`). 「전문보기」로 여는 추가 개인정보 수집 동의서(`demographics`)도 같은 route를 쓴다(#345).
- 약관을 불러오지 못한 상태(화면 설계서 MY(4) 2-2: 「연결이 끊겼어요.」 배너·재시도, 「약관을 불러오지 못했어요」)는 원문이 앱 안 정적 문서라 생기지 않아 만들지 않았다. 원문을 API로 받게 되면 그때 만든다.

### 범위 외

- 약관 버전 관리. 원문은 앱이 가진 정적 문서이고(2026-11-18 범위 결정, #440), 바뀌면 문서 파일을 고쳐 배포한다. 동의 저장에 쓰는 버전 문자열은 서버(`GET /auth/terms`)가 따로 준다.
- 서버에서 최신 적용 버전을 받는 동작(`docs/specs/login-signup.md` 1.3.2는 항상 최신 버전을 보여주라고 한다).
- 접근 제어와 화면 전환 규칙(`AppTransitions`).

## Route와 접근

- Path·params·search: `/signup/terms/service`, `/signup/terms/privacy`, `/signup/terms/demographics`. MY 전용 처리방침(`privacyPolicy`)은 가입 route에서 열리지 않는다. `generateStaticParams`로 이 셋만 정적으로 만들고(`dynamicParams = false`) 그 밖의 값은 404다.
- 접근 권한·guard: 약관 동의 화면과 같다. `(app)` layout의 `AuthGate`가 가입 상태로 막아 가입 중인 사용자만 들어온다(`features/auth/lib/accessPolicy.ts`).
- Layout·redirect·navigation: `(app)/signup/layout.tsx`(체크 상태 provider) 안에서 `SignupFrame`을 쓴다. 뒤로 가기는 `router.back()`이다.

## 상태와 흐름

- 초기 진입: 정적 화면이다.
- Loading·Empty·Error: 해당 없음(요청이 없다).
- Disabled·invalid: 없다. 잘못된 `termId`는 404다.
- Success·완료 후 이동: 뒤로 가기로 약관 동의 화면에 돌아간다. 원문 화면에서 새로고침하거나 직접 URL로 들어온 뒤 돌아가면 체크 상태가 초기화돼 있다(provider가 새로 만들어진다).

## 데이터 의존성

- Query와 enabled 조건: 없음. 원문은 `constants/termsDocuments/`의 정적 데이터다.
- Mutation·cache 영향: 없음.
- API 계약 확인 항목: 없음. 원문은 앱 안 정적 문서로 정했다(#440).

## UI와 접근성

- Component mapping: `SignupFrame`(`Header`에 약관 이름, 뒤로 가기). 나머지는 이 화면 전용이다.
- Keyboard·focus·accessible name: 약관 이름이 `h1`이고(헤더 안, `truncate`) 조항 제목이 `h2`, 조항 안 소제목(국외 이전 업체 이름)이 `h3`이다. 번호 항목은 `ol`, 글머리 항목은 `ul`이다. 링크는 밑줄로 구분하고 모두 같은 창 이동이다. 쉘은 앱 출처가 아닌 이동을 가로채 바깥 앱(브라우저·메일)으로 연다. `target="_blank"`는 쉘에 새 창 처리(`onOpenWindow`)가 없어 Android에서 반응하지 않을 수 있어 쓰지 않았다. 브라우저에서는 같은 탭에서 바깥 페이지로 넘어가고 뒤로 가기로 돌아온다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 좌우 16px이고 375px에서 가로 넘침이 없다. 본문은 `break-keep`로 줄바꿈되고 공백 없는 긴 글자(URL 등)는 폭을 넘으면 끊긴다(Figma는 줄바꿈 위치를 직접 정했지만 화면 폭에 맞춰 자연스럽게 감싼다). 시행일자·버전 줄은 폭이 모자라면 줄을 바꾼다.

| Figma            | 값                                          | 사용한 토큰·utility                                   |
| ---------------- | ------------------------------------------- | ----------------------------------------------------- |
| 시행일자·버전    | 헤더 아래 12, Body-2-Regular 14/21, 연한 색 | `pt-s6 typography-body-3-regular text-text-quinary`   |
| 시행일자 ↔ 조항  | 간격 24, 조항 간격 24                       | `gap-s12`                                             |
| 조항 제목        | Body-1-SemiBold 16/24                       | `typography-body-1-semi-bold text-text-primary`       |
| 조항 제목 ↔ 본문 | 간격 6, 본문 Body-2-Regular 14/21           | `gap-s3 typography-body-3-regular text-text-tertiary` |
| 본문 덩어리 사이 | Figma 없음(최종본 구조), 6                  | `gap-s3`                                              |
| 조항 안 소제목   | Figma 없음, 14/21 SemiBold                  | `typography-body-3-semibold text-text-secondary`      |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 두 경로가 정적으로 생성됨. 잘못된 `termId`의 404와 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음
- [x] 상태별 UI: 네 문서의 제목, 시행일자·버전, 조항 제목 전체, 번호 목록, 하위 목록, 머리말, 소제목, 링크 속성을 테스트로 확인. MY `privacy` 주소가 처리방침을 여는 것과 `privacyPolicy` 주소의 404는 `my/terms/[termId]/page.test.tsx`로 확인
- [x] 관련 test: `TermsDocument.test.tsx`, 체크 유지는 `TermsAgreement.test.tsx`
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 헤더와 시행일자 줄 위치를 Figma 값과 대조. 본문 줄바꿈은 Figma와 다르다(자연 줄바꿈)

## 확인할 항목

- 헤더 제목 위치 (제안): 제목을 헤더에 놓고 `h1`로 만들었다. 헤더의 뒤로 가기 아이콘은 Figma대로 연한 회색(`tone="subtle"`)이고 근거와 확인할 점은 약관 동의 화면 spec과 같다.
- 시행일자·버전 글자 색 (디자인 확인): Figma는 `text-quinary`(`#bcbec2`)이고 흰 배경 대비가 약 1.8:1이라 읽기 어렵다. Figma 값을 따랐다.
- 키보드 스크롤 (미검증): 본문에 포커스 가능한 요소가 없어, iOS WebView에서 키보드·보조 기기로 `main`이 스크롤되는지 확인하지 못했다. 안 되면 본문 래퍼에 `tabIndex`와 이름을 준다.
- 뒤로 가기 (기획 확인): 설계서는 이전 페이지로 이동이다. 직접 URL로 들어와 기록이 없으면 뒤로 가기가 동작하지 않는다.
- 원문 링크 (미검증): 처리방침의 웹 주소·이메일 링크가 iOS·Android 쉘에서 바깥 앱으로 열리는지 실기기로 확인하지 못했다. 메일 앱이 없으면 쉘이 실패를 조용히 넘겨 아무 반응이 없다.
- 이전 판 공개 (다음 개정 때): 처리방침 제 14조는 변경 전 처리방침도 계속 볼 수 있게 공개한다고 약속한다. 첫 판이라 지금은 이전 판이 없다. 개정할 때 이전 판을 보여 줄 위치(문서 버전별 파일과 목록 화면 등)를 정해야 한다.
- 404 화면 (미정): 잘못된 `termId`는 Next 기본 404가 된다. 앱에 `not-found.tsx`가 없어 돌아갈 경로를 주지 않는다. 앱 전체 공백이라 이 화면에서 따로 만들지 않았다.
- 최신 버전 (결정): 원문은 앱 안 정적 문서라 배포한 문서가 곧 최신 버전이다(#440 범위 결정). 원문이 바뀌면 문서 파일과 시행일자·버전을 함께 고친다.
- 원문 내용 (#447, 최종본 1.0): 1.3.2의 원문 3개(서비스 이용약관, 개인정보 수집 및 이용 동의, 추가 개인정보 수집 및 이용 동의)와 MY 전용 개인정보 처리방침을 넣었다. 명세는 [선택] 동의서에 「문의하기」로 철회할 수 있다고 적었지만(7.5.1), 최종본은 마이페이지 > 약관 및 개인정보의 토글로 철회한다고 안내한다(7.4.5 동작과 같음). 원문을 따랐다.
