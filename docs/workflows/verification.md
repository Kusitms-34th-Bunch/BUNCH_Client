# Verification Rules

작은 검증부터 실행하고, 변경 범위에 맞게 확장한다.

| 변경                        | 최소 검증                                             |
| --------------------------- | ----------------------------------------------------- |
| 문서·agent 설정             | 링크·경로 확인, `yarn format:check`                   |
| 컴포넌트·hook               | 관련 테스트, `yarn lint`, `yarn typecheck`            |
| API·공통 유틸리티           | 관련 테스트, `yarn lint`, `yarn typecheck`            |
| 디자인 시스템 public export | 관련 테스트, `yarn check:generated`, `yarn typecheck` |
| 앱 route·빌드 설정          | `yarn lint`, `yarn typecheck`, 대상 앱 build          |
| 사용자 핵심 흐름            | 관련 Playwright E2E                                   |
| 파일 이동·구조 재편         | `git diff -M`로 내용 변경 0 확인, `yarn build`        |
| 포맷만 바꾸는 대량 변경     | 적용 전후 build 산출물 비교, `yarn test`·`typecheck`  |

전체 검증이 필요한 경우 `yarn verify`를 사용한다. 실행할 수 없는 검증은 이유와 함께 보고한다.

## 최종 보고

최종 보고에는 요청 결과와 변경 범위, 실제 실행한 검증과 결과, 실행하지 못한 검증과 이유를 구분해 적는다. 남은 위험, 후속 작업 또는 방향 결정을 요청해야 하는 항목이 있으면 함께 밝힌다.

- 이동과 수정은 한 diff에 섞지 않는다. 이동만 있는 커밋은 `git diff -M`로 내용이 같음을 보일 수 있어야 한다.
- 포맷 일괄 적용은 눈으로 읽지 않고 적용 전후 build 산출물(`--minify false`)을 비교해 차이가 따옴표·공백뿐인지 본다. 일괄 적용 커밋은 `.git-blame-ignore-revs`에 등록한다. 머지 커밋으로 머지하면 해시가 유지되고, rebase 머지는 해시가 바뀌어 무효가 된다.
- sandbox·네트워크·권한 같은 환경 문제로 실패하면 코드 실패로 단정하지 않고, 환경 제약과 코드에서 확인한 근거를 같이 적는다.

UI 변경은 명령어 검증 외에 다음을 변경 영향에 맞게 확인한다.

- loading, empty, error, disabled, invalid 상태
- 긴 텍스트, 좁은 viewport, overflow와 layout shift
- keyboard 접근, focus 흐름, 접근 가능한 이름과 오류 안내
- 디자인 시스템 컴포넌트라면 Storybook의 지원 variant와 상태
