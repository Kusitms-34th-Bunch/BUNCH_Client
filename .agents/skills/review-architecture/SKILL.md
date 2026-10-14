---
name: review-architecture
description: route, feature, shared package, 디자인 시스템의 소유 경계와 import 방향을 검토하거나 결정한다. 폴더 배치나 공통화 판단에 사용한다.
---

# 구조 검토

## 먼저 확인

- `docs/architecture/app-structure.md`, `domain-ownership.md`, `routing-and-access.md`, `components.md`, `component-patterns.md`, `repo-structure.md`와 대상 workspace `AGENTS.md`를 읽는다.
- 현재 import와 public export, 실제 재사용 위치를 조사해 미래 가능성만으로 공통화를 결정하지 않는다.

## 판단 순서

1. 화면·route-local, feature/domain, 앱 공용, cross-app 디자인 시스템·api-core 중 현재 소유자를 정한다.
2. apps가 다른 app에 의존하지 않고 shared package가 app에 의존하지 않는지 확인한다.
3. public API가 필요한지, 내부 파일 import가 누출되는지, 순환 의존 가능성이 있는지 확인한다.
4. 폴더 이동·새 package·새 라이브러리가 필요한 경우 대안과 migration 범위, decision 기록 필요성을 함께 제시한다.

## 출력

- 권장 배치, 허용되는 import 방향, 대안과 선택 이유, 영향받는 파일·검증 범위를 표 또는 bullet로 정리한다.
- 확정되지 않은 도메인·재사용을 가정한 scaffold는 권하지 않는다.
- 파일을 수정하지 않는다.
