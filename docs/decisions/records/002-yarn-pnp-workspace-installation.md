# 002: Yarn PnP workspace 설치 방식 유지

- 상태: accepted

## 배경

이 저장소는 Yarn 4 workspace, catalog, editor SDK를 사용하며 `.yarnrc.yml`에서 `nodeLinker: pnp`와 로컬 cache를 설정한다. web과 admin, shared package가 같은 dependency graph를 쓰므로 package가 선언하지 않은 의존성을 우연히 `node_modules`에서 찾는 흐름을 피할 필요가 있다.

Vite는 Yarn PnP 사용 시 지원 범위 경고를 출력한다. 현재 lint, typecheck, test, build, admin E2E는 PnP에서 통과하지만, 이 경고를 숨기기 위해 설치 방식을 바꾸지는 않는다.

## 결정

Yarn 4 PnP를 workspace의 유일한 설치 방식으로 유지한다. package manager 명령은 `yarn`만 사용하고, 각 workspace는 런타임·개발 의존성을 명시적으로 선언한다.

## 검토한 대안

- Yarn `node-modules` linker는 일부 도구 호환성 경고를 줄일 수 있지만, 현재 선택한 PnP dependency 경계와 editor SDK 흐름을 포기하게 된다.
- pnpm 또는 npm 전환은 lockfile·workspace 설정·CI·editor 설정을 함께 바꾸는 migration이다. 현재 도구 체인이 정상 동작하는 상태에서 경고만을 이유로 전환하지 않는다.

## 영향

- 설치와 CI는 `yarn install --immutable`을 사용한다.
- TypeScript·ESLint·Prettier는 `.yarn/sdks/`를 통해 workspace dependency를 해석한다.
- 새 dependency는 실제 consumer workspace와 root catalog에 선언하고, 다른 package의 transitive dependency에 기대지 않는다.
- Vite 기반 admin 작업에서 PnP 경고가 나타날 수 있으며, 경고 자체는 실패로 취급하지 않는다.

## 검증 / 후속 작업

- package manager 또는 dependency 설정 변경 뒤에는 `yarn install --immutable`과 영향 workspace 검증을 실행한다.
- PnP 관련 오류가 발생하면 우선 package 선언, Yarn SDK, package extension, tool의 공식 PnP 지원 여부를 확인한다.

## 재검토 조건

- 해결 가능한 설정·업스트림 수정 없이 실제 개발 또는 CI를 막는 PnP 전용 오류가 반복될 때
- 새로 도입할 필수 도구가 PnP를 지원하지 않아 유지 비용이 명확히 커질 때
- 전환 범위와 CI·editor·workspace 영향이 검토된 뒤 설치 방식 변경이 승인될 때
