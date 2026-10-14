---
name: create-generator
description: Turborepo generator, template, script, 문서를 안전하게 추가하거나 수정한다. turbo/generators 또는 gen:* scaffold 변경에 사용한다.
---

# Generator 변경

## 먼저 확인

- `docs/workflows/turbo-generators.md`, `turbo/generators`, `turbo/workflows/check-generated.mjs`, 관련 package script와 가까운 template을 읽는다.
- generator가 만드는 workspace·소유자·공개 export·검증 범위를 먼저 정의한다.

## 진행

1. 입력은 필요한 값만 받고 이름·경로·package 식별자를 검증한다.
2. template은 현재 formatter·TypeScript·import 규칙과 generator output 구조를 따른다.
3. 기존 파일을 조용히 덮어쓰지 않으며, 충돌 시 원인과 안전한 대안을 알려준다.
4. 생성되는 source, test, story, export, docs 중 실제로 필요한 항목만 생성한다.
5. generator를 임시 경로 또는 안전한 입력으로 실행해 output과 실패 경로를 확인한다.

## 완료·출력

- 새 command, 입력값, 생성 파일, non-overwrite 동작, 검증 명령과 결과를 적는다.
- generator 도입이 구조·공개 API 규칙을 바꾸면 관련 docs도 함께 갱신한다.
