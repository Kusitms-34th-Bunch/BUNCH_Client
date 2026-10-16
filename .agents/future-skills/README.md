# Future Skills (비활성)

이 폴더의 skill은 `.agents/skills/`의 원본이 아니다. `.claude/skills/` adapter도, `AGENTS.md`/`manifest.md` 라우팅도 연결돼 있지 않아 Claude Code·Codex 모두 지금은 인식하지 못한다. `yarn check:agent-docs`도 이 폴더를 검사하지 않는다.

## 왜 여기 있는가

지금 이 저장소는 디자인 시스템(`@app/design-system`) 기반으로 화면을 짓는다 — 브리프 하나로 마케팅 페이지를 처음부터 생성하는 작업 방식이 아니다. 그래서 아래 skill들은 지금 당장 쓰지 않는다. 다만 나중에 로그인 전 랜딩 페이지, 프로모션 페이지처럼 디자인 시스템 경계 밖에서 "브리프 → 화면"을 처음부터 만들어야 하는 실제 작업이 생기면 바로 꺼내 쓸 수 있도록 문서만 미리 받아둔다.

## 포함된 것

| 폴더                    | 원본 skill 이름            | 용도                                                                                                                                                                                |
| ----------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taste-taste-skill/`    | tasteskill (anti-slop)     | 브리프 → 디자인 톤 추론 → 레이아웃·타이포·색상 생성 가이드                                                                                                                          |
| `taste-soft-skill/`     | high-end-visual-design     | 고급스러운 시각 디자인 기본값(폰트·간격·shadow·카드 구조)                                                                                                                           |
| `taste-redesign-skill/` | redesign-existing-projects | 기존 화면을 "AI 티" 패턴 제거하며 프리미엄 톤으로 올리는 감사                                                                                                                       |
| `pick-ui-library/`      | pick-ui-library            | toast·OTP 입력·virtualization·drag&drop·state 등 흔한 요구별 검증된 라이브러리 하나를 추천하는 lookup                                                                               |
| `library-picks.md`      | (자체 작성)                | 범용 유틸·overlay 상태관리·Suspense 통합·다단계 흐름 등 라이브러리(es-toolkit, overlay-kit, suspensive, use-funnel 등)와 바텀시트(Base UI Drawer vs plainsheet vs vaul) 선택 lookup |

아이콘 파이프라인은 활성화되어 `packages/design-system/scripts/generate-icons.mjs`로 이동했다. 사용 방법은 `docs/architecture/design-system-icons.md`를 따른다.

`taste-*`는 Leonxlnx/taste-skill, `pick-ui-library`는 emilkowalski/skills에서 문서만 가져왔다. `library-picks.md`는 각 라이브러리를 직접 조사해 우리가 쓴 원본 문서다. 실행 스크립트·launcher는 포함하지 않았다.

이 lookup들은 toast·virtualization·state·바텀시트 같은 요구가 실제로 생겼을 때만 꺼내 쓴다. 지금은 해당 요구가 하나도 없어 비활성으로 둔다 — 목록의 라이브러리를 미리 설치하거나 다른 문서에 반영하지 않는다. `docs/conventions/package-management.md`가 새 의존성 추가 전 이 폴더를 먼저 확인하도록 가리킨다.

## 활성화하려면

1. 실제로 브리프 기반 신규 화면 생성이 반복되는 작업으로 확정됐는지 먼저 확인한다(1회성이면 skill화하지 않는다 — `docs/agent/bootstrap.md`의 문서 원칙).
2. 해당 폴더를 `.agents/skills/`로 옮기고, `.claude/skills/{name}`에 symlink adapter를 만든다.
3. `docs/agent/bootstrap.md`의 Skills 표와 `AGENTS.md`에 라우팅을 추가한다.
4. `yarn check:agent-docs`로 adapter 동기화를 확인한다.
5. 이 저장소의 디자인 시스템·token 규칙(`docs/architecture/styling-and-tokens.md`, `docs/architecture/design-system-components.md`)과 충돌하는 지침은 우리 문서를 우선한다.
