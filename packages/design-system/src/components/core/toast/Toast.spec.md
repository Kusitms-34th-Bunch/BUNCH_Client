# 컴포넌트: Toast

## 메타데이터

- 소유 경계: design-system
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Toast`(node `720:4209`). 네 가지 형태(아이콘 유무 × 액션 버튼 유무)가 있고 표시 위치·지속 시간·동시 개수는 디자인에 없다.
- 알림 동작 라이브러리: `sonner`(2.0.8). 선택 근거는 `docs/decisions/records/008-toast-sonner.md`에 둔다.
- 파일: `Toast.tsx`(모양), `Toaster.tsx`(목록 영역), `showToast.tsx`(`toast()` 함수). 컴포넌트와 함수를 한 파일에서 내보내면 Fast Refresh 경고가 나서 나눴다.

## 목적과 범위

### 제공하는 동작

- 앱이 작업 결과를 잠깐 알리는 가벼운 메시지. 사용자의 다음 행동을 막지 않고 자동으로 사라진다.
- 형태 네 가지: 글자만 / 아이콘 + 글자 / 글자 + 액션 버튼 / 아이콘 + 글자 + 액션 버튼.
- 앱은 우리 `toast()`와 `<Toaster />`만 쓴다. 큐·타이머·스와이프·live region은 `sonner`에 맡기고 모양만 우리 토큰으로 적용한다.

### 제공하지 않는 동작

- 성공 외 아이콘(오류·경고·정보), 닫기 버튼, 여러 개 쌓아 보여주기, 로딩·`promise` 토스트는 디자인에 없어서 만들지 않는다.
- sonner의 타입·옵션을 공개하지 않는다. 필요한 옵션은 우리 API에 이름을 붙여 추가한다.
- 오류 분류, 문구, 재시도 같은 제품 판단은 호출하는 쪽이 정한다.

## Public API

- `toast(message, options?)`: 토스트를 띄운다. 반환값은 없다.
  - `message: string` — 화면에 보이고 스크린 리더가 읽는 글자.
  - `options.icon?: 'success'` — 글자 앞 장식 아이콘. 지금은 성공 하나만 있다.
  - `options.action?: { label: string; onClick: () => void }` — 오른쪽 액션 버튼. 누르면 `onClick` 뒤에 토스트를 닫는다.
  - `options.duration?: number` — 자동으로 닫히는 시간(ms). 기본값은 액션 없음 3000, 액션 있음 5000. `Infinity`면 닫히지 않는다.
  - `options.bottomOffset?: number` — 기본 위치(Safe Area + 16px)에서 더 위로 올리는 간격(px). 화면 아래에 고정 버튼이 있을 때 가리지 않도록 호출하는 화면이 정한다.
  - `options.fullWidth?: boolean` — 내용 폭 대신 목록 폭으로 편다(글자 왼쪽, 액션 버튼 오른쪽 끝). 「공유」 버튼이 있는 복사 완료 토스트(Figma `Bunch/Invite/LinkCopied`, node `791:3390`)가 이 모양이다.
- `<Toaster />`: 화면을 그리는 앱의 최상위 layout에 한 번만 둔다(둔 layout 밖의 화면에서는 토스트가 뜨지 않는다. `apps/web`은 `(app)/layout.tsx`에 둔다). props가 없다. 위치·개수·간격은 이 컴포넌트가 정한다.
- `Toast`(표시 전용 컴포넌트): `icon`, `action`, `children` + native `div` 속성. story와 test에서 형태를 그대로 그릴 때 쓰며, 앱은 `toast()`와 `<Toaster />`만 쓰는 것을 기본으로 한다. barrel(`export *`)로 함께 공개되지만 알림 동작은 없다.
- 이벤트: `action.onClick`만 있다. `onClick`이 오류를 던지면 토스트를 닫지 못하므로 던지지 않아야 한다.
- Controlled / uncontrolled: 해당 없음(표시 상태는 sonner가 가진다).
- 호출자 소유 책임: 메시지 문구(i18n), 액션 동작, 언제 어떤 종류를 띄울지, `<Toaster />`를 앱에 한 번 두는 것, 아래 여백이 쓰는 CSS 변수 `--safe-area-bottom`의 정의(앱이 정의하고 없으면 `env()`로 대체한다).

## 상태와 동작

- Default: 아래쪽 가운데에 나타나 3초(액션이 있으면 5초) 뒤 사라진다.
- 동시 개수: 한 번에 하나만 보인다. 새 토스트를 띄우면 이전 것을 먼저 닫고 새로 띄워서 노출 시간을 처음부터 센다(기획 명세 2.4.3의 "다시 복사하면 토스트를 다시 띄우고 처음부터 센다").
- 크기와 간격(Figma): 안쪽 여백 위·아래 8, 왼쪽 12, 오른쪽 8, radius 12, 아이콘(24)과 내용 사이 10, 글자와 버튼 사이 16. 배경은 `surface-inversed` 60% + 2px backdrop blur. 글자는 `body-2-regular`(14/21) 흰색, 버튼은 `Button`(secondary, sm).
- 폭: 내용 폭에 맞추되 목록 폭(sonner 기본 356px, 모바일은 화면 폭 − 좌우 여백)을 넘지 않고 가운데에 놓인다. 긴 글자는 줄바꿈된다(디자인은 한 줄 233px 예시만 있다). 짧은 글자(「저장했어요.」)는 그 폭에 맞춰 좁아진다.
- 표시 위치: 아래쪽 가운데. 아래 여백은 기본 Safe Area + 16px이고, `bottomOffset`을 주면 그만큼 위에 놓인다(항목 높이에 padding으로 포함시켜 sonner가 쌓는 위치에 반영한다).
- 닫는 방법: 자동 닫힘, 액션 누름, 아래로 스와이프(sonner 기본).
- 지원하지 않는 상태: loading, disabled, error 색. 해당 상태가 디자인에 생기면 변형을 추가한다.
- 긴 텍스트·overflow: 줄바꿈하며 토스트가 세로로 늘어난다. 버튼은 줄어들지 않는다.

## 접근성

- Semantic element: 토스트 목록을 `sonner`가 `aria-live="polite"`, `aria-relevant="additions text"`, `aria-atomic="false"` 영역(`section`, 이름 「알림」)으로 렌더링한다. 새 토스트의 글자가 이 영역 안에 추가되어 읽히도록 구성했다(스크린 리더 낭독은 VoiceOver로 확인 전). 영역은 토스트가 없을 때도 항상 있어 랜드마크 목록에 「알림」이 보인다.
- Accessible name·label: 메시지 글자와 버튼 글자가 이름이다. 아이콘은 장식이라 `aria-hidden`이다.
- Keyboard·focus: 토스트는 focus를 가져가지 않는다. `Alt+T`(sonner 기본 단축키, 우리가 바꾸지 않았다)로 영역에 focus를 옮긴 뒤 Tab으로 액션 버튼에 닿는다. sonner는 토스트 항목(`li`)에 `tabIndex=0`을 주기 때문에 이름 없는 항목에 focus가 한 번 멈춘 뒤 버튼으로 간다(VoiceOver 확인 전).
- 자동 닫힘을 멈추는 조건: sonner는 마우스를 올렸을 때, 누르고 있을 때, 문서가 숨겨졌을 때만 타이머를 멈춘다(2.0.8 소스에서 확인). **키보드 focus로는 멈추지 않고** 터치에는 올려 두는 동작이 없다.
- 액션이 있는 토스트의 자동 닫힘: 기획 명세의 5초를 기본으로 두었다. 키보드·스크린 리더·스위치 컨트롤 사용자는 버튼에 닿는 동안 시간이 지날 수 있어 WCAG 2.2.1(시간 조절)에 걸린다. 팀이 이 위험을 수용했다(2026-10-17, 확인할 항목에 근거). 액션이 그 화면의 유일한 수단인 토스트를 만들 때는 이 수용이 적용되지 않는다.
- 3초 토스트: 글자가 길면 읽는 데 부족할 수 있다. 오류처럼 놓치면 안 되는 메시지는 화면에 남는 안내(인라인 오류 등)를 함께 두는 것을 호출하는 쪽의 책임으로 한다.
- 닫기 버튼이 없어서 키보드 사용자는 자동 닫힘을 기다려야 한다.
- 움직임: sonner의 CSS가 `prefers-reduced-motion`에서 전환과 애니메이션을 끈다(2.0.8 소스에서 확인, 실제 동작은 확인 전).
- 상태 전달: 아이콘은 장식이고 의미는 글자가 담는다. 오류·경고 아이콘을 추가할 때도 색이나 아이콘만으로 상태를 구분하지 않고 글자로 함께 알린다.
- Error 안내: 해당 없음.
- 터치 영역: 액션 버튼은 `Button` sm(높이 32)이라 44px에 못 미친다. 디자인이 정한 값이며 `Button` spec의 터치 영역 항목과 같다.
- 알려진 대비 한계(디자인 값, 코드에서 고치지 않음): 배경이 반투명이라 뒤 화면에 따라 달라진다. 흰 화면 위에서는 배경이 약 #7c7e81이 되어 흰 글자 대비가 약 4.0:1로 14px 본문의 WCAG AA 기준(4.5:1)에 못 미친다. 어두운 화면 위에서는 충분하다. 팀이 이 값을 수용하기로 했고(2026-10-17), 디자이너에게 공유한다.

## Styling과 의존성

- Token·기존 primitive: 배경 `bg-surface-inversed/60`, 글자 `text-text-inversed`·`typography-body-2-regular`, 아이콘 색 `text-system-success-fg`, 여백 `p4`·`p6`·`s5`·`s8`, radius `r6`. 액션은 `Button`, 아이콘은 `FillCircleCheckLargeIcon`(고정 크기 export).
- 허용되는 dependency: `sonner`. 이 컴포넌트에서만 쓴다.
- `'use client'`: sonner를 import하는 `Toaster.tsx`와 `showToast.tsx`가 client 모듈이다. `Toast.tsx`는 순수 표시 컴포넌트라 지시어가 없다. 서버 컴포넌트(root layout 등)는 `<Toaster />`를 그대로 import해도 된다(`apps/web` 빌드로 확인).
- Storybook state matrix: 네 가지 형태를 한 `Matrix` story에 모으고, 긴 글자 story와 실제 `toast()`를 눌러 보는 `Playground` story(스냅샷 제외)를 둔다.

## 확인할 항목

- 배경 토큰 (제안): Figma는 `surface/surface-inversed-alpha-60`(#25282d, 60%)을 쓰는데 `tokens.json`에 이 이름이 없다. 같은 색이 나오도록 `surface-inversed`에 투명도 60%를 적용했다. 디자이너가 토큰을 `design-token` 브랜치로 내보내면 그 토큰으로 바꾼다.
- 성공 아이콘 색 (미정): Figma의 `system-success-fg`는 #00dd4b인데 저장소의 같은 이름 토큰은 `green-700`(#00a638)이다. 토큰이 아직 동기화되지 않은 것으로 보이며, 하드코딩하지 않고 저장소 토큰을 쓴다. 화면 색이 Figma보다 어둡게 보일 수 있다. 디자이너 확인.
- 지속 시간 (제안): 기획 명세 2.5.4의 오류 토스트 3초와 2.4.3의 「공유」 버튼이 있는 복사 완료 토스트 5초를 기본값으로 삼았다. 다른 화면의 값은 해당 명세가 나오면 확인한다.
- 표시 위치 (확정): 기획 명세에서 "화면 아래쪽", 오류 토스트는 "하단 버튼 바로 위"라고 했다. 아래쪽 가운데를 기본으로 하고, 화면 하단에 고정 버튼이 있을 때의 간격은 호출하는 화면이 `bottomOffset`으로 정한다(2026-10-18, 초대 화면에서 필요). 폭도 Figma 초대 화면은 화면 폭 가까이 펴져 있어 `fullWidth`로 연다. Figma의 좌우 여백은 왼쪽 19·오른쪽 12로 비대칭이라 목록 폭(좌우 16px)을 쓴다.
- 동시 개수 (제안): 한 번에 하나, 새 토스트가 이전 것을 대체. 쌓아 보여줄 필요가 있는지 기획 확인.
- 아이콘 없고 버튼 없는 형태의 좌우 여백 (제안): Figma는 왼쪽 12, 오른쪽 8을 모든 형태에 쓴다. 글자만 있는 토스트에서 비대칭으로 보인다. 디자이너 확인.
- 글자 대비 (수용, 디자이너 공유): 흰 화면 위에서 약 4.0:1(위 접근성 항목)이다. Figma 값(`surface-inversed-alpha-60`)이라 코드에서 고치지 않았고 팀이 수용했다. 디자이너가 불투명도를 높이면 토큰만 바꿔 반영한다.
- 액션이 있는 토스트의 지속 시간 (수용, 2026-10-17): 5초가 WCAG 2.2.1을 충족하지 못할 수 있다. iOS 앱만 출시하므로(PRD 8장) 키보드 경로(`Alt+T`·Tab)는 거의 쓰이지 않고, 화면에 링크와 복사 아이콘이 남아 같은 목적(링크 보내기)을 토스트 없이도 이룰 수 있어 기능이 막히지는 않는다고 판단했다. VoiceOver·스위치 컨트롤 사용자와 터치(올려 두는 동작이 없음)는 여전히 영향을 받을 수 있으므로 VoiceOver 낭독 확인은 남겨 둔다. 액션이 그 화면의 유일한 수단인 토스트를 만들 때는 다음 중 하나를 적용한다: (a) 액션이 있으면 닫히지 않게 하고 닫기 수단을 디자인에 추가, (b) 영역에 focus가 있는 동안 타이머를 멈추는 처리를 래퍼에 추가(sonner에 옵션이 없다), (c) 그 화면의 다른 경로에도 같은 기능을 둔다.
- `Alt+T` 안내는 키보드가 없는 iOS WebView에서 의미가 작다. 영역 이름을 「알림」으로만 두었다.
- `Dialog`가 열린 동안 토스트가 보이는지: native `<dialog>`의 모달은 top layer라서 토스트가 가려질 수 있다. Dialog 이슈에서 함께 시험한다.
- iOS WebView에서 스와이프·터치·소프트 키보드와의 간격: 실기기 확인 전.
- 번들 크기 증가: 앱 번들에서는 측정하지 않았다. `sonner` 배포 파일은 gzip 약 14KB(JS)·3KB(CSS)이다.
- 웹에서 쓰기 전 선행 조건: `apps/web/src/app/globals.css`에 디자인 시스템 소스의 Tailwind `@source` 등록이 없어서, 웹 빌드의 CSS에 Toast·Button 클래스가 생성되지 않는다(`@source '../../../../packages/design-system/src'`를 임시로 넣어 생성되는 것까지 확인하고 되돌렸다). 별도 작업으로 등록해야 한다.

## 검증

- [x] 사용자 관찰 동작 test: 14개(메시지, 아이콘 장식, 액션 호출·닫힘, 3초·5초 자동 닫힘, `Infinity`, 대체와 시간 재시작, live region) — `yarn workspace @app/design-system test` 통과(전체 140개)
- [x] 지원 variant·edge state story: `Matrix`(네 형태 × 밝은·브랜드 배경), `LongText`, 형태별 4개, `Playground`(스냅샷 제외)
- [x] public export 영향 확인: `yarn check:generated` 통과
- [x] Storybook 렌더 치수 측정: 글자만 253×46, 아이콘 포함 287, 버튼 포함 높이 48, 여백 8/8/8/12, radius 12, 간격 10, 글자 14/21, 버튼 32 #eaeaea. 아이콘 색만 Figma(#00dd4b)와 저장소 토큰(#00a638)이 다르다.
- [x] 실제 `toast()` 동작 측정(headless Chrome): 가운데 정렬, 아래 여백 16, 대체(항상 1개), 글자만·아이콘 약 3초, 액션 약 5초, live region `polite`
- [x] `apps/web`에서 `<Toaster />`를 root layout에 두는 빌드 통과(임시 확인 후 되돌림)
- [ ] iOS WebView 실기기(스와이프·터치·소프트 키보드)
- [ ] 스크린 리더(VoiceOver) 낭독
- [x] `bunch-ui-accessibility-reviewer` 검토: Critical 0, Major 3(테스트 보강·호출자 책임 명시는 반영, 지속 시간은 수용으로 기록), Minor 4, Suggestion 3
