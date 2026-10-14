# 006: 웹 오류 수집에 Sentry를 사용한다

- 상태: accepted

## 배경과 결정

사용자 환경에서 발생하는 웹 오류를 확인하기 위해 `apps/web`에 `@sentry/nextjs`를 도입한다. 직접 오류 수집 서버를 운영하는 대신 Sentry SaaS 무료 Developer 플랜으로 시작한다. 실제 조직의 플랜과 사용량은 Sentry에서 확인한다.

브라우저, Next.js 서버와 Edge 런타임을 초기화하고 App Router 오류를 수집한다. `NODE_ENV=production`이고 `NEXT_PUBLIC_SENTRY_DSN`이 있을 때만 전송한다. Expo 쉘의 네이티브 오류 수집은 이번 범위에서 제외한다.

## 데이터와 기능 범위

- Replay와 tracing sampler를 추가하지 않는다. 로그·메트릭은 전송 훅에서 제외하고 trace 전파 대상도 비운다.
- SDK의 `dataCollection`으로 사용자 정보, 쿠키, 헤더, 본문, query, stack 변수 등의 자동 수집을 끈다.
- 오류 전송 직전에 request, user, extra, contexts, breadcrumbs를 제거한다. 문자열 message와 exception 메시지는 유지하되 URL 전체, 이메일, Bearer·JWT, token·password·inviteCode 등 명시된 키의 값, 한국 휴대전화 패턴을 마스킹한다. 오류 종류·stack과 진단 문구를 남겨 Sentry·Discord에서 원인을 확인한다.
- 패턴 마스킹은 임의의 이름·주소·본문이나 키 없는 불투명 토큰을 탐지하지 못한다. 오류 생성 시 사용자 입력·응답 원문을 넣지 않고 고정 진단 문구를 사용한다. 새로운 민감 데이터 형식이 생기면 테스트와 Sentry 서버 측 정제 규칙을 함께 점검한다.
- 커스텀 tag, fingerprint, stack에 민감정보를 넣지 않는다. 새로운 수집 필드를 추가할 때 이 정책을 다시 확인한다.

## 설정과 검증

`apps/web/.env.example`의 변수를 배포 환경에 설정한다.

- `NEXT_PUBLIC_SENTRY_DSN`: 공개 수집 주소. 브라우저에 포함되므로 배포 빌드 전에 설정한다.
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`: production 또는 preview 등 배포 환경 구분.
- `SENTRY_ORG`, `SENTRY_PROJECT`: source map을 업로드할 조직과 프로젝트.
- `SENTRY_AUTH_TOKEN`: 빌드에서만 사용하는 업로드 토큰. 저장소에 커밋하거나 `NEXT_PUBLIC_` 변수로 만들지 않는다. 없으면 source map 업로드를 비활성화한다.
- `SENTRY_RELEASE`: 선택 사항. CI에서 배포 commit SHA 등으로 설정할 수 있다. 미설정 시 SDK가 배포 환경에서 감지하는 release를 사용한다.

`next.config.mjs`는 Next.js의 TypeScript 설정 로더가 PnP 환경에서 외부 의존성을 잘못 해석하는 문제를 피한다. `.yarnrc.yml`의 package extension은 `@sentry/nextjs`에서 하위 `@sentry/react`로 React peer를 전달한다. SDK에서 이 peer 선언을 제공하면 extension 제거를 검토한다.

`withSentryConfig`는 업로드 후 source map 삭제를 설정한다. Turbo build는 위 환경 변수를 전달하고 캐시 키에 반영한다. 로컬 DSN은 gitignore된 `.env.local`에만 둔다.

관련 테스트, 웹 lint·typecheck·build를 실행한다. 실제 수집은 개인정보 없는 테스트 오류가 Sentry 프로젝트에 나타나는지 별도로 확인한다. source map 업로드는 토큰이 설정된 배포에서 확인한다.

## 대안과 재검토 조건

서버 로그만으로는 브라우저 오류를 확인할 수 없어 Sentry를 선택했다. 자체 호스팅은 운영 부담 때문에 선택하지 않았다. 무료 한도나 팀 접근 제한이 운영을 막거나, 상세 메시지·사용자 행동·네이티브 크래시가 필요해지면 수집 정책과 플랜을 재검토한다.

## 공식 참고

- [Next.js 수동 설정](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [v11 변경 사항](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v10-to-v11/)
