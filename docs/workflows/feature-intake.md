# Feature Intake

기획, Figma, 도메인 정의, API 명세를 구현 파일로 옮기기 전에 하나의 확인 가능한 feature 범위로 정리한다. 이 단계는 코드 생성이 아니라 추측을 줄이고, 이후 page·form·API·test 작업을 병렬로 나눌 수 있게 만드는 절차다.

## 입력과 산출물

| 입력       | 반드시 확인할 내용                                 |
| ---------- | -------------------------------------------------- |
| 기획       | 사용자 목적, 포함·제외 범위, 완료 동작             |
| 도메인     | 용어, entity id, 역할·권한, 상태 전이              |
| 화면·Figma | route, layout, interaction, responsive·a11y 상태   |
| API 명세   | method·path, input·output, error, pagination, auth |

산출물은 feature 가까운 `*.spec.md`다. 여러 route가 같은 도메인 제약을 공유하면 owner 가까운 domain context를 함께 둔다. API가 있으면 `api-contract-map.md`를 추가한다. 구현을 이슈 단위로 나눈 목록은 spec의 "구현 단위와 이슈" 표에 적고, 이슈를 만든 뒤 번호를 채운다.

## 정리 순서

1. 대상 app을 정한다. web과 admin이 같은 제품 개념을 다뤄도 route·UI·권한은 각 app에 따로 기록한다.
2. route, 접근 조건, direct URL, params/search, 진입·완료 후 navigation을 page spec에 적는다.
3. 화면을 route-local UI, feature/domain, app shared, design system 중 현재 소유 경계에 배치한다.
4. loading, background loading, empty, error, disabled, invalid, success 중 실제 사용자에게 보이는 상태를 정한다.
5. API method·path·입출력·error·auth·pagination을 계약 정리에 기록하고 query key와 mutation cache 영향을 정한다.
6. utility, hook, component, route, E2E 중 필요한 가장 작은 test 층과 완료 기준을 정한다.
7. 불명확한 항목은 구현으로 채우지 않는다. 기획·디자인·백엔드 확인 대상으로 분리한다.

## 바로 구현으로 넘길 조건

- owner app과 route·feature 위치가 설명 가능하다.
- 성공·실패·빈 데이터·진행 중 상태의 사용자 동작이 정해졌다.
- API가 있으면 contract, query key input, cache 갱신 대상이 정해졌다.
- public props·hook return·route input처럼 외부가 의존하는 계약이 보인다.
- 최소 검증과 미확정 항목이 기록됐다.

하나라도 빠지면 scaffold만 만들 수는 있어도 사용자 동작을 추측해 완료로 선언하지 않는다.

## 연결되는 실행 지침

- page·route: `create-page-feature`, `.agents/guides/page-feature.md`
- form: `implement-form-flow`, `.agents/guides/form-flow.md`
- API: `assess-api-contract` → `integrate-api` → `verify-api-integration`
- component: `create-app-component` 또는 `create-ds-component`
- test·검증: `gen-tests`, `verify-changes`, 필요 시 `plan-e2e`
- 구현 후 spec 대조: `verify-spec-sync`
