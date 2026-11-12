# 021: 포맷터는 Prettier 대신 oxfmt를 쓴다

- 상태: accepted
- 기록일: 2026-11-10
- 구현 상태(2026-11-10 확인): 구현됨(#305). 루트 `.oxfmtrc.json`, `package.json`의 `format`·`format:check`, `lint-staged.config.mjs`, CI 포맷 단계, 아이콘·OpenAPI 생성 스크립트, `.vscode/oxfmt.sh`.

## 배경과 결정

포맷 검사가 저장소 전체(약 1,900개 파일)에서 8초 넘게 걸려 pre-commit·CI·에디터 저장이 느렸다. Prettier와 결과를 맞춘 Rust 포맷터 oxfmt로 바꾼다.

- 같은 조건 로컬 측정(2026-11-10, Apple M5): `prettier . --check` 8.0~8.5초 → `oxfmt --check` 0.8~1.1초.
- Prettier 기준으로 정리된 저장소에서 oxfmt가 바꾼 파일은 6개뿐이었다. 긴 union 타입의 줄바꿈 방식(5개)과 Prettier가 다루지 않던 TOML(1개)이다. Markdown·YAML·CSS·JSON 시험 입력은 결과가 같았다.
- Tailwind class 정렬은 oxfmt 내장 기능(`sortTailwindcss`, prettier-plugin-tailwindcss와 같은 알고리즘)을 쓴다. import 정렬은 ESLint perfectionist가 계속 맡고 oxfmt의 `sortImports`는 켜지 않는다.
- Yarn PnP에서 그대로 동작한다. 버전은 정확히 고정한다(0.x라 minor에서도 출력이 바뀔 수 있음).
- 에디터: Yarn SDK가 없어 oxc 확장의 `oxc.path.oxfmt`를 `yarn oxfmt`를 실행하는 `.vscode/oxfmt.sh`로 지정한다.

## 대안과 재검토 조건

- oxlint: 타입 기반 규칙(tsgolint)이 TypeScript 7을 요구하는데 TS7이 Yarn PnP를 지원하지 않고, React Compiler·TanStack Query·자체 주석 규칙은 JS 플러그인(알파)에 기대야 해 이번에는 도입하지 않는다. ESLint와 같이 돌리는 중간 단계도 만들지 않는다.
- Biome: 포맷과 lint를 함께 바꿔야 하고 Tailwind 정렬이 없다.
- oxfmt 출력이 Prettier와 크게 달라지거나, PnP·에디터 연동이 깨지면 재검토한다.
- 2026-11-13 시험: PnP에서 TypeScript 7은 typecheck부터 실패한다(패키지와 extends한 workspace tsconfig를 찾지 못함). `nodeLinker: pnpm`은 의존성 경계는 지키지만 web build가 실패하고, `node-modules`는 TS7·tsgolint가 동작하지만 경계가 사라진다. 그래서 oxlint 전환은 계속 보류하고, TypeScript는 PnP에서 동작하는 6.0으로 올렸다.

## 검증

`yarn format:check`, `yarn workspace @app/design-system icons:check`(Node API로 만든 아이콘이 커밋본과 같음), `yarn check:generated`, lint-staged에서 지원하지 않는 파일·ignore 대상이 건너뛰어지는지, `.vscode/oxfmt.sh --lsp`의 initialize 응답.
