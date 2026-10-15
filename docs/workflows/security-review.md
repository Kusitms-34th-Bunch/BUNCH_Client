# Security Review

보안 리뷰는 이 저장소(App Router, TanStack Router, 공유 API 계약) 기준으로 실제 경계를 넘는 결함만 찾는다. `review-changes`가 참조하는 보조 기준이며, 별도 파이프라인이나 산출물을 두지 않는다.

## 적용 시점

- 사용자 입력을 렌더링·저장하는 코드를 추가·수정할 때
- 인증, 권한, 세션, redirect 로직을 변경할 때
- 새 API 호출, 외부 URL fetch, 서드파티 스크립트를 추가할 때
- 환경 변수, API 키, 토큰을 다루는 코드를 추가할 때
- 의존성을 추가하거나 업그레이드할 때

## 경계와 결과를 요구한다

"모범 사례 위반"만으로는 finding이 아니다. 아래 세 가지를 모두 구체적으로 답할 수 있어야 finding으로 남긴다.

- 어떤 입력·행동으로 낮은 권한의 행위자가 접근하는가.
- 어떤 통제(인증, 권한, escaping, origin 검증)를 우회하는가.
- 우회했을 때 실제로 노출·변조되는 대상(다른 사용자 데이터, 세션, 시크릿, 서버 자원)은 무엇인가.

셋 중 하나라도 구체적으로 답할 수 없으면 Suggestion 이하로 낮추거나 finding에서 제외한다.

## 확인 항목

- **XSS**: 사용자 입력이나 외부 응답을 `dangerouslySetInnerHTML`, 직접 DOM 삽입, 템플릿 문자열로 렌더링하는 경로에 escaping·sanitize가 있는가. Content-Security-Policy는 이 저장소에 아직 없다 — 배포 대상이 정해지고 도입한다면 `script-src`에 `unsafe-inline`·`unsafe-eval` 없이 nonce 기반으로 구성하고, `<meta>` 태그가 아니라 실제 HTTP 응답 헤더로 전달한다(`frame-ancestors` 등 일부 지시문은 `<meta>`에서 무시된다).
- **인증·권한 경계**: route guard, server action, API 호출이 로그인 여부뿐 아니라 리소스 소유권·역할까지 검증하는가. 클라이언트 쪽 조건부 렌더링만으로 접근을 막고 있지 않은가. Server Action(`'use server'`)은 middleware나 상위 layout의 접근 제어를 거치지 않고 직접 호출될 수 있는 공개 endpoint다 — action 함수 내부에서 그 자체로 인증·권한을 다시 검증하는가.
- **secret 노출**: 서버 전용 값(API 키, 내부 URL, 토큰)이 client component, 브라우저 번들, 커밋된 파일로 새지 않는가. `NEXT_PUBLIC_`, `VITE_` 접두사가 실제로 공개해도 되는 값에만 붙는가.
- **IDOR**: URL·payload의 id 값을 서버가 요청자 소유인지 검증 없이 그대로 조회·수정에 쓰지 않는가.
- **외부 요청**: 사용자가 제어하는 값으로 서버가 임의 URL을 요청하지 않는가(SSRF), fetch 대상 origin이 고정·검증되는가.
- **의존성**: 새로 추가한 패키지가 유지보수되는 저장소인지, 알려진 취약점이 있는지 확인한다. `yarn npm audit` 같은 도구 결과를 근거로 남긴다. 모든 CVE가 실제로 도달 가능한 것은 아니다 — 취약한 코드 경로가 우리 코드에서 실제로 호출되는지 확인하고, 도달 불가능하면 근거와 함께 심각도를 낮춘다.

- **저장소 변조·공급망**: `package.json`의 `scripts`, `.vscode/`, `.github/`, 설정 파일(`eslint.config.*` 등)처럼 폴더를 열거나 install·dev·lint를 돌릴 때 실행되는 경로가 코드 오너 리뷰 없이 바뀌지 않는가. 이 경로는 `.github/CODEOWNERS`와 `yarn check:suspicious`가 다룬다(`docs/workflows/ci.md`의 "변조 가드와 CODEOWNERS").

## Anti-pattern

- lint·프레임워크가 이미 강제하는 규칙(예: React의 기본 escaping)을 별도 finding으로 다시 보고하지 않는다.
- 실제 도달 경로가 없는 이론적 취약점("만약 이 함수가 이렇게 쓰인다면")을 확정된 finding처럼 보고하지 않는다. 확실하지 않으면 finding을 낮추고 근거와 함께 남긴다.
- 배포 설정, WAF, CDN처럼 저장소 밖에 있는 통제를 코드만 보고 있다/없다고 단정하지 않는다.

## 심각도

심각도의 정본은 `docs/code-quality/review.md`의 Finding 기준이다. 보안 영역에는 아래 표로 적용한다.

| 수준       | 기준                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| Critical   | 인증 우회, 다른 사용자 데이터·세션 접근, secret 유출처럼 즉시 악용 가능한 경계 위반 |
| Major      | 조건이 갖춰지면 악용 가능한 경계 위반(제한적 XSS, 검증 누락된 IDOR)                 |
| Minor      | 악용 난이도가 높거나 영향이 제한적인 방어 취약점                                    |
| Suggestion | 방어 심층화 제안, 확인된 경계 위반은 아님                                           |

## 참고

- 전역 `security-review` 스킬과 OWASP Top 10 기준은 이 문서와 함께 쓴다. 이 문서는 그 기준을 이 저장소의 실제 stack(App Router, TanStack, 공유 API 계약)에 맞게 좁힌 것이다.
- 바이너리 분석, 공급망 서명 검증처럼 이 저장소 범위를 넘는 깊은 보안 감사가 필요하면 별도 도구를 독립적으로 사용하고, 이 문서 체계로 편입하지 않는다.
