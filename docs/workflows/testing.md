# Testing Rules

모바일 앱의 설치·실행과 기기별 수동 확인은 [모바일 앱 실행과 테스트](./mobile-testing.md)를 따른다.

## 도구와 위치

- unit·component test는 Vitest와 Testing Library를 사용한다. React test 환경은 `happy-dom`이다.
- 테스트는 대상 파일 가까이에 `Foo.test.tsx`, `useFoo.test.ts` 형태로 둔다. 공용 setup은 각 앱 루트의 `vitest.setup.ts`에 둔다.
- E2E는 Playwright의 루트 `e2e/`에서 관리한다. 현재 대상은 admin Chromium 흐름이다.

`src/test`는 provider render helper, 공통 fixture처럼 반복되는 기반이 실제로 생겼을 때 만든다. 특정 화면의 mock·handler·fixture는 test 가까이에 두고 실제 반복 계약이 확인된 뒤에만 공통화한다.

## 범위

- 테스트는 구현 세부보다 사용자가 관찰할 수 있는 동작을 검증한다.
- 분기·상태 전이가 있는 hook과 form·modal·interaction 컴포넌트는 단위 테스트를 우선 추가하거나 갱신한다.
- 순수 presentational UI는 Storybook 또는 상위 흐름 검증으로 충분한지 먼저 판단한다.
- route, 인증, 여러 화면을 건너는 핵심 흐름은 Playwright E2E 범위를 검토한다.
- DOM 탐색은 role, label, text 순으로 하고 CSS selector는 최후에 사용한다.
- component test는 render → 사용자 interaction → 관찰 가능한 output 순으로 작성한다. 하나의 `it`에는 하나의 핵심 동작을 둔다.
- hook은 input/action → state transition → 공개된 result를 검증한다. UI markup과 style은 hook test의 범위가 아니다.
- API·Query test는 request input, response/error mapping, cache에 보이는 결과 중 하나 이상을 검증한다.

## Worst-case 데이터

컴포넌트를 데모 데이터로만 확인하면 실제 값에서 깨지는 레이아웃을 놓친다. 폼·목록 컴포넌트를 추가·수정하면 아래 범주 중 관련 있는 것을 최소 하나는 실제로 넣어본다.

| 범주              | 극단값 예시                                              | 흔한 실패                                                         |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 이름              | 긴 이름+하이픈, 한 글자(`J`), CJK(`王秀英`), 이모지 시작 | 줄바꿈 위치, initials 로직, `.charAt(0)`이 서로게이트 페어를 자름 |
| 이메일·URL·식별자 | 공백 없이 끊어지지 않는 긴 문자열                        | `overflow-wrap` 없으면 형제 요소를 밀어냄                         |
| 라벨·카피         | 번역 시 길어지는 문구, 태그 여러 개                      | 줄바꿈, `+N` overflow 필요                                        |
| 숫자·금액         | 0, 1(복수형), 1,284(천단위 구분), `0.1 + 0.2`            | "0 members", 구분자 누락, 부동소수점 오차 노출                    |
| 목록              | 0개, 1개, 페이지 크기+1, 1,000개+                        | empty state 누락, pagination off-by-one, 가상화 필요              |
| 시간              | 지금, 미래 날짜, 타임존 경계                             | "0초 전" 같은 어색한 상대 시간, UTC·로컬 날짜 차이                |
| 이미지            | 404, 없음, 극단적 종횡비                                 | fallback 부재, 왜곡                                               |
| 상태              | 로딩, 에러, 권한 없음, 본인 항목                         | 원시 에러 메시지 노출, disabled 상태의 레이아웃 붕괴              |

숫자·날짜는 직접 문자열로 조립하지 않고 `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`을 쓴다.

## 격리와 금지 사항

- mock은 네트워크·시간·브라우저 경계에 한정하고, 내부 구현을 과도하게 mock하지 않는다.
- 비동기 UI는 임의의 대기 시간 대신 `findBy*`, `waitFor`처럼 관찰 가능한 완료 조건을 기다린다.
- timer, storage, navigation 같은 경계는 필요한 부분만 mock하고, fake timer 사용 뒤에는 원래 timer로 복원한다.
- 테스트는 로컬 `.env` 값에 의존하지 않는다. 화면·컴포넌트 test는 endpoint 모듈을 mock하고, endpoint 래퍼 test는 transport 함수만 mock한다. 실제 API origin을 test에 적지 않는다(URL 조립 자체를 검증할 때만 예외). env 필수값 검사가 test의 import 경로에서 실행되면 로컬에서는 통과하고 CI에서만 깨진다.
- 실패한 테스트를 `skip` 또는 `only`로 숨기지 않는다.
- 외부 라이브러리 내부 동작이나 단순 정적 마크업만을 위한 snapshot 테스트는 피한다.
- 기대값을 구현과 같은 방식으로 다시 계산해서 assert하지 않는다. 기대값은 known-good 값, spec, 예제처럼 구현과 독립된 출처에서 가져온다.
- private 함수 호출, 내부 상태, DB 직접 조회처럼 공개 인터페이스를 우회하는 경로로 검증하지 않는다. 리팩터링으로 동작이 그대로인데 테스트가 깨지면 이 경로를 의심한다.

## 추가할지 판단

| 변경                               | 우선 대상                                                |
| ---------------------------------- | -------------------------------------------------------- |
| 순수 utility·mapper                | 정상·경계·오류 input/output                              |
| form, modal, interactive component | interaction, validation, disabled·error·success          |
| hook·server state                  | state transition, retry·invalidation 등 관찰 가능한 결과 |
| 단순 copy·style만의 변경           | 별도 unit test가 필요한지 판단하고 생략 이유 기록        |
| route·권한·여러 화면 흐름          | Playwright E2E 범위 검토                                 |

테스트가 부족한 리팩터링은 동작을 보존하는 regression test를 먼저 추가한다. coverage 수치만을 목표로 테스트를 늘리지 않는다.

## 기능별 최소 검증 판단표

| 변경                | 확인할 계약                                    | 우선 검증                       |
| ------------------- | ---------------------------------------------- | ------------------------------- |
| route·권한          | 접근 가능 여부, redirect, fallback             | route test 또는 E2E smoke       |
| query               | key에 포함된 parameter, 성공·오류·빈 결과      | hook 또는 component test        |
| mutation            | 요청 payload, 성공 후 cache·UI 갱신, 실패 안내 | hook 또는 component test        |
| form                | validation, 제출 중 비활성화, 서버 오류 복구   | component test, 핵심 흐름은 E2E |
| 공용 component·hook | public props·반환값, 상태 전이, 접근성         | 가까운 unit·component test      |
| utility·mapper      | 정상·경계·잘못된 input                         | unit test                       |
| 버그 수정           | 재현 조건과 수정 후 관찰 결과                  | regression test                 |

fixture와 mock은 대상 test 가까이에 둔다. 둘 이상의 독립된 test에서 같은 계약을 공유할 때만 `src/test`의 공용 기반으로 올린다. 문서만 바꾼 작업은 관련 링크 확인과 `yarn check:agent-docs`를 우선한다.
