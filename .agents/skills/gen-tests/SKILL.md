---
name: gen-tests
description: 관찰 가능한 component, hook, API boundary, utility 동작을 위한 Vitest·Testing Library test를 추가한다. 회귀 방지 검증이 필요할 때 사용한다.
---

# 테스트 작성

## 목표와 선택 기준

구현 세부가 아닌 사용자가 관찰할 수 있는 계약을 잠근다. unit/component test로 충분한 동작을 E2E로 옮기지 않고, 여러 화면을 지나는 핵심 흐름만 E2E 후보로 분리한다.

## 입력 점검

- 대상 source 전체와 export·사용처를 읽는다.
- 수정 전 동작, 새로 보장할 동작, regression 위험, 외부 경계를 구분한다.
- 가까운 test와 app의 `vitest.setup.ts`, `docs/workflows/testing.md`를 읽는다.

## 테스트 층 선택

| 대상                             | 우선 검증                                                   |
| -------------------------------- | ----------------------------------------------------------- |
| 순수 utility·mapper              | input/output, error case                                    |
| hook                             | `renderHook`, action, observable state transition           |
| interactive component·form·modal | render, user interaction, accessible output                 |
| API boundary                     | request input, response/error mapping, cache-visible result |
| page 간 핵심 흐름                | `plan-e2e`로 Playwright 범위 검토                           |
| 순수 presentational UI           | Storybook 또는 상위 흐름이 충분한지 먼저 판단               |

## 작성 순서

1. 대상 파일 가까이에 `Foo.test.tsx` 또는 `useFoo.test.ts`를 둔다.
2. test 이름은 조건과 관찰 결과를 설명한다. 하나의 `it`에는 하나의 핵심 동작을 둔다.
3. component는 render → `userEvent` interaction → role/label/text로 관찰 가능한 output을 검증한다.
4. hook은 input 또는 action → state transition → exposed callback/result 순으로 검증한다.
5. utility는 정상 입력, boundary input, invalid input 또는 error contract를 검증한다.
6. 새 분기가 있으면 loading, empty, error, disabled, success 중 실제로 영향받는 상태를 포함한다.

## 격리 규칙

- network, time, storage, navigation, browser API만 필요한 최소 범위로 mock한다.
- component 내부 hook이나 구현 세부를 과도하게 mock하지 않는다.
- 비동기는 `findBy*`, `waitFor` 같은 완료 조건을 기다린다. 고정 sleep을 넣지 않는다.
- timer·global mock은 test 뒤 복원한다.
- role → label → text 순으로 query하고 `data-testid`는 접근 가능한 query가 불가능한 경우에만 사용한다.

## 금지

- CSS class, private state, library 내부 동작, 정적 markup만을 위한 snapshot에 의존하지 않는다.
- 실패 test를 `skip` 또는 `only`로 숨기지 않는다.
- 검증하지 않은 fallback·fixture를 실제 API 계약처럼 만들지 않는다.

## 완료 기준과 출력

- test가 하나 이상의 명확한 사용자·계약 위험을 보호한다.
- mock 경계와 제외한 상태가 설명 가능하다.
- 실행한 targeted test와 lint/typecheck 결과, 미실행 이유를 보고한다.
