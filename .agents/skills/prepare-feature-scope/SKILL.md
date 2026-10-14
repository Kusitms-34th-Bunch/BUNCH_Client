---
name: prepare-feature-scope
description: 기획, Figma, 도메인 정의, API 명세를 현재 monorepo의 route·feature·API·상태·검증 범위로 정리한다. 새 도메인 또는 기능 구현을 시작하기 전에 사용한다.
---

# Feature 범위 준비

## 먼저 읽기

1. `docs/workflows/feature-intake.md`
2. `docs/workflows/spec-writing.md`
3. `docs/architecture/domain-ownership.md`, `docs/architecture/routing-and-access.md`
4. 대상 app의 `AGENTS.md`, 가까운 route·feature·spec
5. API가 있으면 `docs/architecture/data-layer.md`와 `.agents/templates/api-contract-map.md`

## 작업 순서

1. 기획에서 사용자 목적, 완료 동작, 제외 범위와 미확정 사항을 분리한다.
2. 대상 app·route·접근 조건·URL input·완료 navigation을 정리한다.
3. 구현을 route-local, feature/domain, app shared, design system 중 가장 작은 현재 owner에 배치한다.
4. page·component·hook 중 알맞은 `*.spec.md` 템플릿을 선택한다. 여러 feature가 같은 제약을 공유하면 `domain-context.md`를 owner 가까이에 추가한다.
5. API가 있으면 contract map에 endpoint, query key input, cache 영향, 화면 상태를 정리하고 `assess-api-contract`로 넘긴다.
6. 구현 단위를 page, form, API, component, test로 나누고 각 단위의 완료 기준과 검증을 명시한다.

## 출력

- owner app과 예상 파일 경계
- route·접근·상태 계약
- 필요한 spec·domain context·API contract map 위치
- 구현 순서와 연결할 후속 skill
- 이슈 후보: 구현 단위마다 제목(짧은 자연어), 브랜치 타입, 브랜치명, 체크리스트 초안, 선행 단위. Figma node나 기획 문서 링크는 상세 내용에 넣는다.
- 확인이 필요한 기획·디자인·백엔드 항목

## 기록

정리한 결과는 대화에만 두지 않고 feature spec에 저장한다. 위치는 `docs/workflows/spec-writing.md`를 따른다(owner가 정해졌으면 feature 가까운 `*.spec.md`, 아니면 `docs/specs/<slug>.md`). 이 저장은 `gh` 인증과 무관하다.

1. spec이 없으면 `.agents/templates/feature-spec.md`로 `Draft` 상태의 초안을 만들고, 이미 있으면 바뀐 부분만 갱신한다. 만든 위치를 사용자에게 알린다.
2. 이슈 후보는 spec의 "구현 단위와 이슈" 표에 적는다. 이슈 칸은 비워 둔다.
3. 기획이 확정되지 않아 아직 이슈로 만들 수 없는 단위는 표에 적되, 이유를 "확인이 필요한 항목"에 남긴다.
4. 이슈 생성은 이 skill이 하지 않는다. 표의 단위를 `prepare-issue`에 한 번에 넘겨 승인받고 만들도록 안내한다. 만든 뒤에는 `prepare-issue`가 표의 이슈 칸에 번호를 채운다.

## 경계

- 이 skill은 기본적으로 계획과 문서화를 한다. 사용자가 요청하지 않으면 route·API·component를 생성하지 않는다.
- 아직 확정되지 않은 권한, endpoint, 디자인 token, 공용화는 scaffold나 의존성으로 선반영하지 않는다.
