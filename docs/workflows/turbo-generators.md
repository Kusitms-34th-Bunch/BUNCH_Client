# Turbo Generators

Turbo generator는 반복 scaffold의 파일 구성과 export 흐름을 일관되게 만드는 보조 도구다.

## Available generator

```bash
yarn gen:ds-component
```

`ds-component`는 PascalCase component name을 받고 `@app/design-system`에 component, unit test, Storybook story, local index를 생성한 뒤 root barrel export를 동기화한다.

- endpoint, business rule, product copy처럼 generator가 알 수 없는 계약은 생성하지 않는다.
- 기존 파일을 덮어쓰지 않는다.
- 기존 파일과 충돌하면 generator가 병합을 추측하지 않는다. 생성 중단 또는 명시적 사용자 선택으로 처리하고, 수동 병합이 필요한 위치를 안내한다.
- generator 또는 template을 바꾸면 `yarn check:generated`와 `yarn format:check`를 실행한다.
- 새 generator는 실제 반복 구조가 생긴 뒤에만 추가한다.
- generator는 구조·보일러플레이트·export 동기화만 소유한다. route 등록, API endpoint, business rule, 제품 copy, 인증 정책을 추론해 만들지 않는다.

## Generated artifacts

- OpenAPI type, component export처럼 생성된 파일은 직접 수정하지 않는다. schema, template, generator source를 바꾼 뒤 해당 명령으로 다시 생성한다.
- 생성물 검증 명령이 있으면 CI와 로컬 검증에 포함한다. 생성물과 원본의 불일치를 수동 편집으로 맞추지 않는다.
- 아직 생성 명령이 없는 폴더를 위한 barrel, icon pipeline, check script를 미리 만들지 않는다.

## 생성물 변경

OpenAPI 타입, barrel index, generator 산출물처럼 source에서 재생성되는 파일은 직접 고치지 않는다. source, template, generator 또는 schema를 수정한 뒤 생성 명령을 실행하고 관련 check를 통과시킨다.

생성 규칙과 수동 구현이 섞이는 경계는 문서에 명시한다. 생성 파일의 오류를 임시 수정으로 가리지 않는다.

생성물이 merge·rebase 충돌을 일으키면 손으로 병합하지 않는다. 한쪽 브랜치의 버전을 그대로 택한 뒤 원본 생성 명령을 다시 실행해 재생성한다. `yarn.lock` 충돌은 `docs/conventions/package-management.md`를 따른다.

generator 변경 후에는 template, 생성 script, public export, test·story·spec 산출물, 생성 검증 명령과 관련 문서를 함께 확인한다. 실제 임시 이름으로 sample을 생성해 파일명·format·export·기존 파일 보호를 검증한다.
