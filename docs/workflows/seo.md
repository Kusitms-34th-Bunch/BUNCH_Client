# Web SEO

이 기준은 `apps/web`의 공개 페이지에만 적용한다. admin이나 로그인 뒤의 도구 화면에 마케팅 SEO를 억지로 적용하지 않는다.

## Metadata

- root layout에는 서비스명, 기본 설명, 언어와 공통 Open Graph 기본값을 둔다.
- 공개 정적 route는 route의 성격을 설명하는 `title`, `description`을 제공한다.
- 공개 동적 route만 실제 데이터에 근거해 `generateMetadata`를 사용한다. 존재하지 않거나 권한이 필요한 데이터를 메타데이터에서 노출하지 않는다.
- browser에 노출되는 canonical URL, image URL, 분석 ID는 확정된 public 환경변수 또는 배포 설정에서만 가져온다. 임시 도메인이나 placeholder를 커밋하지 않는다.
- 상대 경로 OG image의 절대 주소는 `metadataBase`를 두지 않고 Next 기본값(Vercel 배포 설정)에 맡긴다. 운영은 `VERCEL_PROJECT_PRODUCTION_URL`, 미리보기 배포는 `VERCEL_BRANCH_URL`·`VERCEL_URL`, 개발은 localhost다(next 16.4.6 `resolve-url.js` 확인, #442). 요청 헤더(Host·`x-forwarded-host`)로 만들지 않는다. 배포 뒤에는 실제 링크의 `og:image`가 운영 도메인인지 확인한다(시스템 환경 변수가 실행 시점에 없으면 localhost가 된다).

## Crawling assets

- 실제 공개 URL과 색인 대상 route가 정해지면 `app/sitemap.ts`, `app/robots.ts`, favicon·apple touch icon·OG image를 추가한다.
- 인증, 개인 데이터, preview 전용 route는 sitemap에 넣지 않는다.
- 새 공개 페이지는 heading 구조, 의미 있는 이미지 alt, 공유 미리보기 metadata를 함께 확인한다.

## Verification

- metadata를 바꾼 route는 `yarn workspace @app/web typecheck`로 확인한다.
- 배포 전에는 production URL의 title, description, canonical, OG preview와 robots·sitemap 응답을 확인한다.
