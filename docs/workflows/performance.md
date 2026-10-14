# Performance

성능 변경은 측정된 증상과 대상 route를 먼저 정한다. 추측만으로 `memo`, cache, lazy loading을 추가하지 않고, 같은 방식으로 전후를 비교한다.

## 데이터와 네트워크

- 서로 의존하지 않는 요청은 병렬 실행을 검토하고, 사용자 이동을 막지 않아도 되는 부수 작업은 기다리지 않는다.
- pagination, 검색, 자동완성은 이전 요청이 화면 결과를 덮어쓰지 않도록 query key와 취소·stale 상태를 함께 확인한다.
- loading, error, empty 상태를 없애서 속도가 빨라진 것처럼 보이게 하지 않는다.
- `await`는 실제로 그 값을 쓰는 분기 안으로 미룬다. 함수 앞에서 미리 기다리면 그 값이 필요 없는 분기(조기 반환, 실패 경로)까지 불필요하게 지연된다.

## 렌더링과 상태

- 다른 state에서 계산할 수 있는 값은 effect로 복제하지 않는다.
- 자주 바뀌는 state는 무거운 목록·chart·editor와 분리하고, memoization은 profiler 또는 재현 가능한 비용 근거가 있을 때만 사용한다.
- 긴 목록은 화면 밖 DOM 비용, key 안정성, virtualization 또는 점진 렌더링 필요성을 확인한다.
- 이벤트로 처리할 수 있는 side effect를 state 변경 뒤 effect로 우회하지 않는다.

## 메모리

- 메모리 사용량이 문제인지 먼저 profiler로 확인한다. CPU·네트워크 지연을 메모리 최적화로 해결하려 하지 않는다.
- 큰 목록·응답은 필요한 범위만 보여 주고, 무제한 client cache·listener·timer·object URL은 수명 종료 시 정리한다.
- 이미지·파일은 표시 크기와 전송 크기를 함께 확인한다. 해상도만 낮춰 품질이나 접근성을 해치지 않는다.
- cache 상한, pagination, virtualization은 측정된 메모리 증가 또는 화면 밖 DOM 비용이 있을 때만 도입한다.

## 코드와 번들

- 초기 화면에 필요 없는 route, editor, chart, SDK는 실제 사용자 진입 시점에 맞춰 분리한다.
- package public API와 bundle 최적화가 충돌하면 package 경계를 먼저 지킨다.
- 반복 검색, 대량 변환, date formatting처럼 hot path가 확인된 경우에만 자료구조·계산 캐싱을 바꾼다.
- 큰 asset과 third-party SDK는 번들 분석 결과를 보고 조정한다.
- 아이콘·컴포넌트 라이브러리를 새로 추가할 때, 그 라이브러리가 barrel entry(`export * from './module'`)로 수천 개 모듈을 재노출하면 import 하나가 개발 서버 부팅과 cold start에 수백 ms를 더한다. apps/web에서는 `next.config`의 `experimental.optimizePackageImports`에 등록해 타입·자동완성은 유지한 채 직접 import로 변환되게 하고, admin처럼 Next.js가 아닌 곳에서는 라이브러리의 서브패스에서 직접 import한다.

## 이미지 (apps/web)

아직 이미지를 쓰는 화면이 없지만, 추가하면 아래 기준을 적용한다.

- `<img>` 태그 대신 `next/image`를 쓴다. raw `<img>`와 video poster는 Next.js가 최적화·lazy loading을 자동 적용하지 않는다.
- LCP 요소가 될 이미지(최초 화면의 hero, 대표 이미지)에는 `priority`를 주고 lazy loading을 끈다. 그 외 이미지는 `next/image`의 기본 lazy loading에 맡긴다.
- `sizes`를 실제 렌더 크기에 맞게 지정한다. 비워두면 반응형 breakpoint마다 과도하게 큰 이미지를 받는다.
- 폰트는 `next/font`로 self-hosting해 외부 요청과 layout shift를 줄인다.

## Next.js 서버 컴포넌트 (apps/web)

apps/web은 아직 Server Action을 쓰지 않지만, 도입하면 아래 기준을 적용한다.

- async 컴포넌트가 데이터를 기다리는 동안 화면 전체를 막지 않는다. 데이터가 필요한 하위 트리만 `Suspense`로 감싸 나머지 레이아웃을 먼저 보여준다. 레이아웃이 데이터에 따라 달라지거나 layout shift를 피해야 하는 경우는 예외로 남긴다.
- 형제 컴포넌트가 각자 fetch하면 병렬로 실행된다. 부모 컴포넌트가 fetch를 먼저 `await`한 뒤 자식을 렌더링하면, 자식이 그 값을 쓰지 않아도 같이 지연된다 — composition으로 형제 관계를 유지한다.
- Server Component에서 Client Component로 넘기는 값은 실제로 쓰는 필드만 좁혀서 전달한다. RSC 경계는 전달한 모든 필드를 직렬화해 응답 크기에 그대로 반영한다.
- 인증·DB 조회처럼 `fetch`가 아닌 비동기 작업을 같은 요청 안에서 여러 번 호출하면 `React.cache()`로 중복 호출을 막는다. 인자를 객체로 넘기면 매번 새 참조라 캐시가 항상 miss되므로, 원시값 인자를 우선한다.
- Server Action은 그 자체로 공개 endpoint다. middleware나 상위 layout의 접근 제어에만 기대지 않고, 각 action 내부에서 인증·권한을 다시 확인한다. `docs/workflows/security-review.md`를 함께 따른다.

## 검증 기록

- 대상 route, 측정 방식, device·network·cache 조건, 변경 전후 결과, 남은 불확실성을 PR 또는 작업 기록에 남긴다.
- 최적화 전에 원인을 먼저 지목한다. LCP라면 어떤 요소와 어느 단계가 지연을 차지하는지, INP라면 어떤 상호작용이 가장 느렸고 시간이 어디서 쓰였는지, CLS라면 어떤 요소가 밀렸는지 먼저 밝힌다. 원인을 지목하지 않은 최적화 목록은 실제로 그 지표를 개선했다는 근거가 아니다.
- 실사용자 지표(p75 등 field data)와 로컬·CI에서 측정한 lab 진단을 같은 것으로 취급하지 않는다. lab 결과는 하나의 device·network 조건에서의 진단 샘플이며, field data 없이 "실사용자 체감이 좋아졌다"고 단정하지 않는다.
- LCP, FCP, CLS, TBT 같은 browser metric과 bundle/resource 크기는 같은 문제로 취급하지 않는다. 사용자 증상에 맞는 지표를 고른다.
- 외부 API, CDN image, third-party SDK, browser extension, local cache가 결과에 미치는 영향을 기록한다. 제어할 수 없는 병목을 코드 최적화 효과로 주장하지 않는다.
- async 영역은 가능한 크기를 예약해 layout shift를 피하고, 초기 화면에 불필요한 SDK·asset은 실제 진입 시점에 맞춰 지연한다.
- 실제 performance budget은 배포 URL과 안정된 baseline이 정해진 뒤 warning 기준부터 별도 workflow로 운영한다. report artifact는 repository에 커밋하지 않는다.
