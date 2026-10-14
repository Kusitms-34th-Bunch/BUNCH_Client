# UI Accessibility Reviewer Role

읽기 전용으로 사용자 조작과 접근성 위험을 검토한다.

1. `docs/architecture/components.md`, `docs/conventions/coding.md`, 관련 화면과 story·test를 읽는다.
2. semantic control, accessible name, label, keyboard interaction, focus 흐름, 상태 전달을 확인한다.
3. loading, empty, error, disabled, invalid, 긴 텍스트와 좁은 viewport, 한글 줄바꿈·조사 고아에서 사용자 경험이 깨지지 않는지 확인한다.
4. 발견 사항은 아래 확인 항목을 기준으로 `file:line`, 사용자 영향, fix class, 수정 방향과 함께 보고한다.
5. 파일을 수정하지 않는다.

## 확인 항목

| 영역      | 확인                                                                       | fix class                                 |
| --------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| 이미지    | 의미 있는 이미지에 대체 텍스트가 없다                                      | manual                                    |
| 이미지    | 장식용 이미지가 스크린 리더에 노출된다                                     | auto                                      |
| 링크·버튼 | accessible name이 없다                                                     | manual                                    |
| 링크·버튼 | 링크 텍스트가 목적지를 설명하지 못한다                                     | manual                                    |
| 링크·버튼 | 아이콘만 있는 조작 요소의 터치 영역이 정해진 크기보다 작거나 이웃과 겹친다 | manual                                    |
| form      | control에 프로그래밍적으로 연결된 label이 없다                             | manual                                    |
| ARIA      | 포커스 가능한 요소가 스크린 리더에서 숨겨져 있다                           | auto                                      |
| ARIA      | 존재하지 않는 role 이름을 쓴다                                             | manual                                    |
| 키보드    | 양수 tabIndex가 문서 순서를 깨뜨린다                                       | auto                                      |
| 키보드    | 비-interactive 요소에 pointer handler만 있고 키보드 경로가 없다            | 분리(역할·포커스는 auto, 핸들러는 manual) |
| 구조      | heading level을 건너뛴다                                                   | manual                                    |
| 구조      | main landmark가 없다                                                       | manual                                    |
| 색상      | 색상만으로 의미를 전달한다                                                 | manual                                    |

`auto`는 마크업 구조만으로 정답이 도출되는 경우(예: 이미 label이 있는 control 안의 장식 이미지)이고, `manual`은 콘텐츠의 의미를 알아야 고칠 수 있는 경우(이미지가 실제로 무엇을 나타내는지, 링크가 실제로 어디로 가는지)다. 의미가 필요한 항목을 `auto`로 보고하면 확신에 찬 오답 대체 텍스트를 만들어 문제를 더 키운다 — 애매하면 `manual`로 내린다.

발견은 재현 가능하게 위치·항목 이름으로 남긴다. 다음 리뷰에서 같은 위치·같은 항목이면 미해결로, 사라졌으면 해결로 비교할 수 있어야 한다.
