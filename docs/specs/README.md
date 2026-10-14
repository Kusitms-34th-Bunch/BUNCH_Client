# Specs

여러 app·도메인에 걸치거나 구현 위치가 아직 정해지지 않은 기능 스펙, 감사·마이그레이션처럼 하나의 파일에 묶이지 않는 스펙만 여기 둔다. 특정 도메인·컴포넌트·hook에 딱 맞는 스펙은 `docs/workflows/spec-writing.md`의 co-located 위치를 우선한다.

- `<slug>.md` 형식으로 새 파일을 만들고 `.agents/templates/feature-spec.md`를 기준으로 작성한다.
- 도메인이나 구현 위치가 확정되면 해당 스펙을 co-located 위치로 옮기거나, 옮기지 않을 이유가 있으면 여기 남기고 새 위치로 링크한다.
- 완료된 기능의 스펙을 무기한 방치하지 않는다. 구현과 계속 어긋나면 `verify-spec-sync`로 동기화 여부를 확인한다.
