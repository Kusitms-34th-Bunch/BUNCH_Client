# 컴포넌트: Skeleton

## 메타데이터

- 소유 경계: design-system(`core`)
- Status: 구현(#473)

## 목적과 범위

### 제공하는 동작

- 서버에서 오는 내용을 받는 동안 그 자리를 채우는 회색 상자 하나
- 모양(`shape`)과 회색 단계(`tone`)만 고르고, 크기는 실제 요소와 같게 호출자가 `className`으로 준다
- 은은하게 깜빡인다. 동작 줄이기 설정이면 멈춘다

### 제공하지 않는 동작

- 화면별 배치(피드 카드, 목록 행 등). 조합은 앱이 맡는다
- 받는 중 안내 문구. 상자는 화면 읽기 프로그램에 숨기므로 쓰는 쪽의 상태 영역(`role="status"`)이 안내한다
- 받는 중인지 판단(언제 보일지는 쓰는 쪽이 정한다)

## Public API

- Props: `shape`(`rect` 기본 · `round` · `block`), `tone`(`default` 기본 · `strong`), `className`, 그 밖의 `span` 속성. `children`은 받지 않는다
- 이벤트: 없음
- Controlled / uncontrolled: 해당 없음
- 호출자 소유 책임: 실제 요소와 같은 크기·간격, 받는 중 안내

## 상태와 동작

- Default: `rect` + `default`(`surface-secondary`, 모서리 `r2`)
- Variant·size: `round`는 원·알약(`rounded-full`, 정사각형이면 원·가로가 길면 알약), `block`은 모서리 없음(사진 칸). `strong`은 `surface-tertiary`(실제 빈 자리가 더 진한 회색이거나 회색 배경 위일 때)
- Loading·empty·error·disabled·selected: 해당 없음(그 자체가 받는 중 표시)
- 긴 텍스트·overflow: 해당 없음

## 접근성

- Semantic element: `span`(`display: block`). 글줄·버튼 안에도 넣을 수 있다
- Accessible name·label: 없음, `aria-hidden="true"`
- Keyboard·focus: 초점을 받지 않는다
- Error 안내: 해당 없음

## Styling과 의존성

- Token·기존 primitive: `surface-secondary`, `surface-tertiary`, `radius-r2`, Tailwind `animate-pulse`(`motion-safe:`)
- 허용되는 dependency: `tailwind-variants`
- Storybook state matrix: 모양 × 색, 목록 한 줄 조합 예

## 확인할 항목

- 깜빡임 (제안): Figma에 스켈레톤 상태가 없어 프런트엔드가 넣었다. 결과를 보고 뺄지 사용자가 정한다(2026-11-20)
- 색 (제안): 기존 스켈레톤(사진함·번치 더보기·차단 목록)과 같은 `surface-secondary`를 기본으로 했다. 디자이너 확인 전

## 검증

- [x] 사용자 관찰 동작 test: 숨김(호출자가 `aria-hidden`을 넘겨도 유지)·모양·색·크기. 깜빡임 정지는 `motion-safe:` 클래스로만 확인했고 미디어 쿼리 동작 자체는 브라우저 캡처(`reducedMotion: 'reduce'`)로 정지 화면만 봄
- [x] 지원 variant·edge state story
- [x] public export 영향 확인: `gen:index`로 `core/index.ts`에 추가, `gen:index:check`·`check-ds-components` 통과(2026-11-20)
- [x] 실행 command와 결과: `yarn workspace @app/design-system test --run src/components/core/skeleton` 6개 통과
