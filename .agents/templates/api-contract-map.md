# API 계약 정리: <기능 또는 endpoint>

## 소유와 호출 위치

- App·route·feature:
- 호출 UI:
- 재사용 범위:

## 계약

| 항목                  | 내용 |
| --------------------- | ---- |
| Method·path           |      |
| Path·search parameter |      |
| Request body          |      |
| Success response      |      |
| Error·auth·permission |      |
| Pagination·cursor     |      |

## 서버 상태 설계

- Query key와 response-changing parameter:
- Query mode: 일반·suspense·infinite·route prefetch 중 선택 근거
- Cache 갱신: invalidate·`setQueryData`·혼합 중 선택 근거
- Retry·stale time 등 계약상 필요한 정책:

## 화면 상태와 검증

- loading·background loading·empty·error·disabled·success:
- 접근성 또는 사용자 안내:
- 필요한 unit·component·E2E 범위:

## 미확정 사항

- 백엔드 또는 기획 확인이 필요한 항목:
