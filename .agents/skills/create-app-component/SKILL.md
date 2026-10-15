---
name: create-app-component
description: 명확한 소유 경계와 집중 테스트를 갖춘 앱 공용 React 컴포넌트를 생성하거나 확장한다. 한 앱 안에서 재사용되는 UI에 사용한다.
---

# 앱 공용 컴포넌트

## 먼저 확인

- `docs/architecture/components.md`, `component-patterns.md`, 대상 app `AGENTS.md`, 가까운 공용 component와 사용처를 읽는다.
- 현재와 가까운 두 곳 이상에서 같은 계약이 필요한지 확인한다. 하나의 route만 쓰면 route-local로 둔다.
- 코드 주석은 `docs/conventions/coding.md`의 주석 규칙을 따른다..

## 진행

1. props는 관찰 가능한 UI 계약만 노출하고, page·route·domain 상태를 숨은 전역 의존성으로 만들지 않는다.
2. 디자인 시스템 primitive를 우선 조합하고, cross-app 재사용이 검증될 때만 design-system으로 이동한다.
3. variant·상태·event·empty content의 동작을 타입으로 제한하고, 기본값과 오류 상태를 명확히 한다.
4. 접근 가능한 name, keyboard 동작, focus, disabled·error 상태와 className·ref forwarding 필요성을 확인한다.
5. interactive 또는 분기 있는 컴포넌트는 가까이에 동작 중심 test를 둔다.

## 완료·출력

- 소유 앱, public import 위치, props 계약, 지원 상태, 검증 결과를 적는다.
- 다른 app 또는 package를 import하지 않고, 실제 재사용 근거 없는 범용화·새 의존성 추가를 하지 않는다.
