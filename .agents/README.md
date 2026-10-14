# Agent Operations

`docs/`는 사람이 읽는 공식 기준이며, 이 폴더는 그 기준을 확인·유지하기 위한 agent 운영 보조물만 둔다.

| 경로             | 용도                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `flows/`         | 작업 전·검증·완료 보고의 공통 진행 흐름                                 |
| `guides/`        | 반복 구현 절차. `docs/`을 참조하는 실행 지침                            |
| `skills/`        | 반복적으로 사용하는 repo-scoped agent skill 원본                        |
| `future-skills/` | 아직 활성화하지 않은 서드파티 skill. 라우팅에 연결돼 있지 않다          |
| `scripts/`       | 문서 구조·연결 검증 스크립트                                            |
| `templates/`     | decision, troubleshooting, feature spec처럼 반복 기록에 쓰는 템플릿     |
| `state/`         | 로컬 agent 실행 상태. Git에 포함하지 않음                               |
| `notes/`         | 이 저장소의 공식 결정이 아닌 개인 조사·리서치 메모. Git에 포함하지 않음 |

새 규칙은 이 폴더가 아니라 `docs/`에 작성한다. guide와 flow는 규칙을 복제하지 않고 참조만 한다. 구조 변경 뒤에는 `yarn check:agent-docs`를 실행한다.

현재 skill 목록과 선택 기준은 `docs/agent/bootstrap.md`의 Skills 표를 따른다. skill은 반복 절차를 실행하는 표면이고, 문서의 규칙을 대체하지 않는다.
