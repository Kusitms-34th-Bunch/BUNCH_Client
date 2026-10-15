# Pull Request Review

## 기본 원칙

- 일반 리뷰는 `.agents/skills/review-changes/SKILL.md`로 읽기 전용으로 수행한다.
- CodeRabbit은 root `.coderabbit.yaml`을 기준으로 PR의 자동 1차 리뷰를 수행한다. 저장소 규칙은 `AGENTS.md`와 `docs/`를 knowledge base로 읽고, path instruction은 실제 workspace 경계를 보조한다.
- 기본 브랜치는 `develop`으로 유지하고, CodeRabbit의 추가 자동 리뷰 대상에서도 `main`을 제외한다. `develop` → `main` 릴리스 PR은 개별 PR에서 검토한 변경을 모으므로 중복 자동 리뷰를 생략한다. CI와 브랜치 보호 검사는 유지한다. CodeRabbit은 기본 브랜치를 자동 리뷰하므로 기본 브랜치를 `main`으로 바꾸면 이 제외 조건이 성립하지 않는다.
- CodeRabbit review와 사람이 작성하는 리뷰는 실제 버그, 보안·권한·접근성, API·cache·route 경계 문제를 우선한다. 취향 차이와 생성물에는 inline comment를 남기지 않는다.
- 외부 PR comment 게시가 명시된 경우에만 `yarn review:pr`을 사용한다. 올라온 PR의 inline 리뷰는 `.agents/skills/review-pr/SKILL.md`로 진행하며, 이 스킬을 호출한 것이 게시 요청이다.
- 게시하는 inline comment는 영향이 큰 항목 최대 5개로 제한하고, 새 지적이 없으면 코멘트 없이 `Code Review` 섹션에 "추가로 남길 inline comment는 없습니다."라고 쓴다.
- 버그, 보안, 접근성, 데이터·권한 처리, 사용자 흐름 회귀처럼 근거가 분명한 항목만 inline comment로 남긴다.
- 취향 차이, 생성물, lockfile, 이미지 자산은 게시하지 않는다.
- 코멘트를 쓰기 전에 CodeRabbit과 팀원이 이미 연 thread를 확인한다. 같은 지적은 새로 쓰지 않고 이미 다뤄졌다고만 기록한다.
- GitHub 화면에서 본 사실(check 통과, 변경 파일)과 로컬에서 실행한 검증을 섞지 않는다. "GitHub에서 Verify 통과가 보임"과 "로컬에서 `yarn verify` 통과"는 다른 근거이고, 화면만 본 PR은 구현이 끝났거나 로컬 검증이 통과했다고 쓰지 않는다.

## 게시 준비

1. `.env.pr-review.example`을 참고해 gitignore된 `.env.pr-review`에 `GH_TOKEN`을 둔다. token에는 대상 저장소의 Pull requests read/write 권한이 필요하다.
2. 아래 형식의 JSON payload를 만든다. `line`은 변경된 줄, `side`는 새 코드면 `RIGHT`, 삭제된 기존 코드면 `LEFT`다.

```json
{
  "body": "## Summary\n\n변경 요약\n\n## Code Review\n\n확인한 항목 요약",
  "comments": [
    {
      "path": "apps/admin/src/features/members/api.ts",
      "line": 24,
      "side": "RIGHT",
      "body": "실패 응답을 화면 상태로 연결해 주세요."
    }
  ]
}
```

3. 항상 dry-run으로 대상과 payload를 먼저 확인한다.

```sh
yarn review:pr -- --pr 12 --comments /path/to/review.json --dry-run
```

4. 게시 요청이 명시된 경우에만 `--publish`를 붙인다.

```sh
yarn review:pr -- --pr https://github.com/OWNER/REPO/pull/12 --comments /path/to/review.json --publish
```

게시 실패 시 payload는 유지한다. 수정한 뒤 다시 dry-run부터 실행한다.
