---
name: create-ds-component
description: 저장소 generator, test, Storybook story, 생성 export 검증으로 @app/design-system의 재사용 컴포넌트를 생성하거나 확장한다. 공용 UI primitive 작업에 사용한다.
---

# 디자인 시스템 컴포넌트

## 먼저 확인

- `docs/architecture/design-system-components.md`, `docs/architecture/components.md`, `.agents/guides/design-system-component.md`, package export와 가까운 story·test를 읽는다.
- 최소 두 app 또는 package에서 같은 API·스타일 계약이 필요한지 확인한다. 도메인 문구·API·route 상태는 포함하지 않는다.
- 코드 주석은 `docs/conventions/coding.md`의 주석 규칙을 따른다.

## 진행

1. 새 컴포넌트는 반드시 `yarn gen:ds-component <PascalCase 이름>`(예: `yarn gen:ds-component UserAvatar`)으로 시작한다. 폴더와 파일을 직접 만들지 않는다. 이름 인자를 빠뜨리면 대화형 입력을 기다리므로 항상 함께 준다. 생성된 파일을 채우는 방식으로 구현한다. 기존 컴포넌트를 확장할 때만 generator를 쓰지 않는다.
2. 구현 전에 생성된 폴더에 `.agents/templates/component.spec.md`로 `<이름>.spec.md` 초안을 쓴다(목적, public props, 지원·비지원 상태, 토큰 대응, 접근성). 답을 알 수 없는 항목은 추측으로 채우지 않고 `확인할 항목`에 남긴다.
3. 구현 결과가 달라지는 `확인할 항목`은 `docs/workflows/development.md`에 따라 구현 전에 사용자에게 묻는다.
4. token·기존 primitive를 조합하고, 임의 색상·spacing·새 styling 규칙을 추가하지 않는다.
5. props, variant, size, disabled·loading·error 상태를 명시적 타입으로 제한한다.
6. accessible name, keyboard/focus, semantic HTML, ref와 className 확장 정책을 확인한다.
7. story는 지원 variant·상태를 드러내고 test는 사용자 관찰 동작을 검증한다.

## 완료·출력

- public export, generator 영향, story/test, consumer 호환성, `yarn check:generated` 및 대상 검증 결과를 보고한다.
- app 전용 의존성, server data, route·feature 상태를 design-system에 넣지 않는다.
- spec의 상태·검증·`확인할 항목`을 구현 결과에 맞춰 갱신한다. 실행하지 않은 검증은 체크하지 않는다.
- 완료를 보고하기 전에 `bunch-ui-accessibility-reviewer`를 호출한다(`docs/agent/bootstrap.md`의 필수 호출 기준). 호출하지 않았다면 호출했다고 쓰지 않는다.
