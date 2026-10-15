---
name: implement-from-figma
description: 이 저장소의 디자인 시스템, token, 컴포넌트 배치, 검증 기준으로 Figma 디자인 또는 screenshot을 접근성 있는 React UI로 구현한다. 시각 디자인 구현에 사용한다.
---

# 디자인 기반 UI 구현

## 먼저 확인

- `docs/workflows/development.md`의 "Figma·스크린샷 구현"을 따라 디자인 조회·후속 스킬·필수 리뷰·시각 검증을 연결한다. 현재 제공된 Figma 도구와 플러그인 스킬을 확인하며, 플러그인 설치 경로를 저장소에 고정하지 않는다.
- `docs/architecture/components.md`, `component-patterns.md`, `design-system-components.md`, 대상 app·design-system의 가까운 UI를 읽는다.
- design source의 화면 상태·breakpoint·asset·interaction 범위와 현재 token·component로 표현 가능한 범위를 확인한다.

## 진행

0. 구현 전에 Figma 속성(색, 반경, 폰트, padding, gap)을 현재 token·utility에 대응시킨 표를 먼저 만든다. 대응하는 token이 없으면 하드코딩하지 않고 가장 가까운 기존 token을 쓴 뒤, 어떤 값이 어긋났는지 PR 설명에 남기고 새 token은 제안만 한다.
1. 기존 design-system component와 token을 우선 사용하고, 실제 반복 규칙이 없는 새 token·primitive는 만들지 않는다.
2. 화면 전용 조립은 route-local 또는 feature에 두고, props·variant는 지원 상태만 타입으로 모델링한다.
3. SVG·이미지는 기존 asset 파이프라인을 따르며, 원본 asset을 임의로 인라인 재작성하지 않는다.
4. 390px 수준의 좁은 폭, 긴 텍스트, truncate/min-width, dynamic content와 empty·loading·error 상태를 확인한다.
5. semantic HTML, accessible name, focus·keyboard, color만으로 전달된 정보가 없는지 확인한다.

## 완료·출력

- 사용한 token·기존 component, 새 UI의 소유 위치, 지원 화면 상태, 시각·접근성 검증 결과를 적는다.
- Figma에 없는 동작·token·responsive 규칙은 추측으로 확정하지 않고 전제로 표시한다.
- 시각 검증은 `docs/workflows/development.md`와 `docs/agent/agent-browser-mcp.md`에 따라 기준 화면과 실제 렌더를 비교한다. 레이아웃·타이포그래피·색상·에셋별 차이와 수정 후 재확인 결과를 적는다. 둘 중 하나만 있으면 통과로 표현하지 않고 없는 입력을 명시한다.
