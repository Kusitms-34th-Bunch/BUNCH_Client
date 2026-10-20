# 페이지: 약관 원문

## 메타데이터

- Route: `/signup/terms/[termId]`(`apps/web/src/app/(app)/signup/terms/[termId]/page.tsx`). `termId`는 `service`(서비스 이용약관)·`privacy`(개인정보 처리방침)
- Status: UI 구현됨(`next build` 결과를 Figma 값과 측정으로 대조함). 문구는 임시이며 실기기 검증 전
- 디자인 출처: Figma `서비스 이용약관`(node `916:7802`), `개인정보 처리방침`(node `916:7823`). 화면설계서(node `916:7706`·`916:7727`). 기능 spec은 `docs/specs/login-signup.md`(1.3.2).

## 목적과 범위

### 포함

- 약관 동의 화면의 약관 행 오른쪽 버튼으로 여는 약관 원문 화면. 앱 안 화면으로 열고 닫아도 동의 화면의 체크 상태가 유지된다.
- 구성: 헤더(뒤로 가기·약관 이름), 시행일자·버전, 조항 4개(제목 + 문단 또는 번호 항목).
- 헤더는 상단 고정이고 본문만 스크롤된다.

### 범위 외

- 약관 최종 원문과 버전 관리. 설계서는 "서비스 이용약관, 개인정보 처리방침 모두 추후에 변경될 예정(지금은 형식과 페이지 연결만 참고)"이라고 했다. 문구·시행일자·버전은 임시다.
- 서버에서 최신 적용 버전을 받는 동작(`docs/specs/login-signup.md` 1.3.2는 항상 최신 버전을 보여주라고 한다).
- 접근 제어와 화면 전환 규칙(`AppTransitions`).

## Route와 접근

- Path·params·search: `/signup/terms/service`, `/signup/terms/privacy`. `generateStaticParams`로 이 둘만 정적으로 만들고(`dynamicParams = false`) 그 밖의 값은 404다.
- 접근 권한·guard: 아직 없다(약관 동의 화면과 같다).
- Layout·redirect·navigation: `(app)/signup/layout.tsx`(체크 상태 provider) 안에서 `SignupFrame`을 쓴다. 뒤로 가기는 `router.back()`이다.

## 상태와 흐름

- 초기 진입: 정적 화면이다.
- Loading·Empty·Error: 해당 없음(요청이 없다).
- Disabled·invalid: 없다. 잘못된 `termId`는 404다.
- Success·완료 후 이동: 뒤로 가기로 약관 동의 화면에 돌아간다. 원문 화면에서 새로고침하거나 직접 URL로 들어온 뒤 돌아가면 체크 상태가 초기화돼 있다(provider가 새로 만들어진다).

## 데이터 의존성

- Query와 enabled 조건: 없음. 원문은 `constants/termsDocuments.ts`의 임시 데이터다.
- Mutation·cache 영향: 없음.
- API 계약 확인 항목: 약관 원문을 API로 주는지 앱 안 정적 문서인지(`login-signup.md` 확인할 항목 백엔드 4번).

## UI와 접근성

- Component mapping: `SignupFrame`(`Header`에 약관 이름, 뒤로 가기). 나머지는 이 화면 전용이다.
- Keyboard·focus·accessible name: 약관 이름이 `h1`이고(헤더 안, `truncate`) 조항 제목이 `h2`다. 번호 항목은 순서 있는 목록(`ol`)이다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 좌우 16px이고 375px에서 가로 넘침이 없다. 본문은 `break-keep`로 줄바꿈되고 공백 없는 긴 글자(URL 등)는 폭을 넘으면 끊긴다(Figma는 줄바꿈 위치를 직접 정했지만 화면 폭에 맞춰 자연스럽게 감싼다). 시행일자·버전 줄은 폭이 모자라면 줄을 바꾼다.

| Figma            | 값                                          | 사용한 토큰·utility                                    |
| ---------------- | ------------------------------------------- | ------------------------------------------------------ |
| 시행일자·버전    | 헤더 아래 12, Body-2-Regular 14/21, 연한 색 | `pt-s6 typography-body-2-regular text-text-quaternary` |
| 시행일자 ↔ 조항  | 간격 24, 조항 간격 24                       | `gap-s12`                                              |
| 조항 제목        | Body-1-SemiBold 16/24                       | `typography-body-1-semi-bold text-text-primary`        |
| 조항 제목 ↔ 본문 | 간격 6, 본문 Body-2-Regular 14/21           | `gap-s3 typography-body-2-regular text-text-tertiary`  |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 두 경로가 정적으로 생성됨. 잘못된 `termId`의 404와 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음
- [x] 상태별 UI: 두 약관의 제목, 시행일자·버전, 조항 4개, 번호 목록을 테스트로 확인
- [x] 관련 test: `TermsDocument.test.tsx`, 체크 유지는 `TermsAgreement.test.tsx`
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] 헤드리스 Chromium(375×812)에서 헤더와 시행일자 줄 위치를 Figma 값과 대조. 본문 줄바꿈은 Figma와 다르다(자연 줄바꿈)

## 확인할 항목

- 임시 문구의 오탈자 정리 (제안): Figma 서비스 이용약관의 「제 2조 (목적)」은 개인정보 처리방침의 「제 2조 (용어의 정의)」와 같은 내용이라 「용어의 정의」로, 「무단 계시」는 「무단 게시」로, 인용부호는 “ ”로 바로잡아 넣었다. 최종 문구가 오면 모두 교체된다.
- 헤더 제목 위치 (제안): 제목을 헤더에 놓고 `h1`로 만들었다. 헤더의 뒤로 가기 아이콘은 Figma대로 연한 회색(`tone="subtle"`)이고 근거와 확인할 점은 약관 동의 화면 spec과 같다.
- 시행일자·버전 글자 색 (디자인 확인): Figma는 `text-quaternary`(`#bcbec2`)이고 흰 배경 대비가 약 1.8:1이라 읽기 어렵다. Figma 값을 따랐다.
- 키보드 스크롤 (미검증): 본문에 포커스 가능한 요소가 없어, iOS WebView에서 키보드·보조 기기로 `main`이 스크롤되는지 확인하지 못했다. 안 되면 본문 래퍼에 `tabIndex`와 이름을 준다.
- 뒤로 가기 (기획 확인): 설계서는 이전 페이지로 이동이다. 직접 URL로 들어와 기록이 없으면 뒤로 가기가 동작하지 않는다.
- 404 화면 (미정): 잘못된 `termId`는 Next 기본 404가 된다. 앱에 `not-found.tsx`가 없어 돌아갈 경로를 주지 않는다. 앱 전체 공백이라 이 화면에서 따로 만들지 않았다.
- 최신 버전 (미정): 항상 최신 적용 버전을 보여주려면 서버에서 받아야 한다.
