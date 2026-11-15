---
name: verify-github-workflows
description: 저장소 script와 문서 기준으로 GitHub Actions, issue·PR 자동화, review workflow 변경을 검토한다. .github 변경에 사용한다.
---

# GitHub Workflow 검증

## 먼저 확인

- 변경된 `.github` 파일, 연결된 root package scripts, `.agents/scripts`, 관련 문서와 issue/PR template을 읽는다.
- trigger, 권한, secret, checkout ref, 실행 command, 생성되는 GitHub 결과를 분리해 파악한다.

## 감사 항목

1. event와 branch 조건이 의도한 범위에서만 실행되는지 확인한다.
2. permissions는 최소 권한이고 token·secret을 log·output·커밋에 노출하지 않는지 확인한다.
3. workflow가 실제 존재하는 Yarn script·파일 경로·label·template id를 참조하는지 확인한다.
4. issue title·branch·label·PR close 처리가 재실행해도 안전하고 실패를 숨기지 않는지 확인한다.
5. CI 검증이 local `yarn verify` 또는 범위별 명령과 모순되지 않는지 확인한다.

## 출력

- trigger, inputs/secrets, 수행 작업, 사용자에게 보이는 결과, 검증 상태를 표로 작성한다.
- 위험은 `파일:줄`, 권한·보안·재실행 영향, 수정안을 포함한다. 외부 workflow를 실행·게시하지 않는다.
