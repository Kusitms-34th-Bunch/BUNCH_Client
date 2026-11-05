# 010: UI 컴포넌트는 디자인 시스템(core·web 구역)에, 조합은 features에 둔다

- 상태: accepted
- 구현 상태(2026-10-18 확인): 구현됨. 기존 컴포넌트를 `src/components/core/`로 옮기고 `@app/design-system/web` 공개 주소, 생성기 구역 선택, 구조 검사, import 경계 규칙을 추가했다. `src/components/web/`은 첫 전용 컴포넌트(`BottomNavigation`, 2026-10-18)가 들어오면서 채워졌다.

## 배경

Figma 컴포넌트 페이지에는 공통 부품과 사용자 앱 전용 부품(하단 내비게이션, 계정 전환 등)이 함께 늘어난다. 기존 기준(두 앱 이상에서 재사용해야 디자인 시스템에 승격)으로는 앱 전용 UI가 `apps/web/src/shared`에 쌓여 Storybook·Chromatic 검증과 토큰 설정을 받지 못한다. 그 사이 헤더용 SearchField·TextField가 앱 쪽에 만들어졌다.

## 결정

- Figma에 컴포넌트로 정의된 UI는 사용처 수와 관계없이 `@app/design-system`에 둔다.
- 패키지 안을 `core`(모든 앱 공통)와 `web`(`apps/web` 전용)으로 나눈다. 폴더 이름은 쓰는 앱 폴더 이름을 따른다. 구역 선택 질문은 "BUNCH 사용자 앱에서만 의미가 있는가?"다.
- `core`는 `@app/design-system`, `web`은 `@app/design-system/web`으로 공개한다. 루트 barrel에는 `web`을 넣지 않는다.
- 의존 방향은 `web`→`core` 한쪽이다. `core`는 `web`을, `apps/admin`은 `@app/design-system/web`을 import하지 않는다(ESLint).
- 두 구역 모두 route, domain data, API를 직접 알지 않고 props·slot·callback으로 받는다. 그것들을 조합해 문구·route·데이터·행동을 붙이는 일은 앱의 `src/features/<feature>/`가 맡는다.
- 화면 틀(`AppFrame`, `PageShell`)과 route shell은 앱에 남는다.
- 구역 이름은 `core`/`web`으로 정했다. 어드민 전용 UI가 DS 수준 검증을 필요로 하면 `admin`을 추가한다. 비어 있는 구역은 만들지 않는다.

## 비교한 대안

- 평평한 `components/` 유지: 변경이 가장 적지만 공통 부품과 앱 전용 UI의 경계가 흐려지고 어드민이 생기면 분리 비용이 커진다.
- 앱 전용 UI를 `apps/web`에 두기: 규칙은 단순하지만 시각 검증과 토큰 설정을 DS와 따로 관리해야 한다.
- 별도 UI 패키지: 계층이 가장 깨끗하지만 패키지 설정·빌드·스토리 연결 비용이 크다.
- `shared`·`common`·`user` 같은 구역 이름: `shared`·`common`은 `apps/web/src/shared`, 어드민 `components/common`과 겹치고, `user`는 앱 이름(`web`)과 달라서 대응을 외워야 한다.

## 결과

- `승격 기준` 대신 `배치 기준`을 쓴다. 두 곳 이상 쓰일 때까지 기다리지 않고 UI는 처음부터 디자인 시스템에 둔다.
- 앱 전용 UI도 Storybook·Chromatic 검증을 받는다.
- 이번 이동: 기존 6개 컴포넌트와 헤더에 쓰는 SearchField·TextField·AccountSwitcher를 모두 `core`에 둔다. `web` 구역은 첫 전용 컴포넌트로 하단 내비게이션(`BottomNavigation`)을 두었다.
- 디자인 시스템이 제품 흐름의 일부 UI를 갖게 되므로 컴포넌트가 문구·route·데이터를 직접 import하지 않는다는 경계가 더 중요하다. 리뷰에서 확인한다.
- Storybook 제목은 바꾸지 않았다(`Components/…`, web은 `Web/…`). Chromatic 기준선 영향은 첫 실행에서 확인한다.

## 다시 검토할 조건

- `web` 구역이 커져 `core`와 구분이 어려워지거나, DS의 번들·빌드·검증 비용이 앱 전용 UI 때문에 커질 때: 별도 패키지를 검토한다.
- `admin` 구역이 필요해질 때: 같은 규칙으로 추가한다.
