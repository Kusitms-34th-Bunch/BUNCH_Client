# 005: 작업은 develop으로 모으고 main은 프로덕션용으로 둔다

- 상태: accepted
- 기록일: 2026-10-14

## 배경

이슈를 열면 workflow가 default branch에서 작업 브랜치를 만든다. 프로덕션과 작업 중인 코드를 같은 브랜치에 두면, 머지가 곧 배포가 되어 중간 상태를 모아 둘 곳이 없다.

## 결정

- 작업 브랜치는 `develop`에서 만들고 `develop`으로 PR한다.
- `main`은 프로덕션에 나갈 버전만 받는다. `develop`에서 `main`으로 올리는 릴리스 PR로만 갱신한다.
- 저장소의 default branch를 `develop`으로 설정한다. 이슈 브랜치 자동 생성이 별도 코드 변경 없이 `develop`에서 만들어진다.

## 검토한 대안

- `main` 하나만 쓰는 GitHub Flow: 단순하지만 머지가 곧 프로덕션이고, 여러 PR에 걸친 작업을 모아 검증할 곳이 없다.
- default branch는 `main`으로 두고 workflow에서 `develop`을 하드코딩: default 설정과 workflow가 어긋나도 알아채기 어렵다. 필요하면 이 방식으로 바꿀 수 있다.

## 영향

- 새 저장소를 만들면 default branch를 `develop`으로 바꾼다. 바꾸지 않으면 이슈 댓글의 "기준" 항목이 `main`으로 보이므로 그때 알아챌 수 있다.
- PR의 기본 대상이 `develop`이다. `main`으로 가는 PR은 릴리스 PR뿐이다.
- 프로덕션 배포는 `main` 기준이다.
- `.claude/hooks/guard-rules.mjs`가 agent의 `main` 직접 push를 막는다.

## 검증 / 후속 작업

- `main`으로 가는 PR의 출발 브랜치를 `develop`으로 제한하는 확인은 workflow 또는 branch ruleset으로 걸 수 있다. 아직 걸지 않았다.

## 재검토 조건

- 릴리스를 `develop` 한 줄로 관리하기 어려워지면(핫픽스를 `main`에 바로 올려야 하는 일이 잦아지면) 핫픽스 경로를 따로 정한다.
