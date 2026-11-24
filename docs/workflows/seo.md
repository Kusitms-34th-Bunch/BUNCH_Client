# Web SEO

이 기준은 `apps/web`의 공개 페이지에만 적용한다. admin이나 로그인 뒤의 도구 화면에 마케팅 SEO를 억지로 적용하지 않는다.

## Metadata

- root layout에는 서비스명, 기본 설명, 언어와 공통 Open Graph 기본값을 둔다.
- 공개 정적 route는 route의 성격을 설명하는 `title`, `description`을 제공한다.
- 공개 동적 route만 실제 데이터에 근거해 `generateMetadata`를 사용한다. 존재하지 않거나 권한이 필요한 데이터를 메타데이터에서 노출하지 않는다.
- browser에 노출되는 canonical URL, image URL, 분석 ID는 확정된 public 환경변수 또는 배포 설정에서만 가져온다. 임시 도메인이나 placeholder를 커밋하지 않는다.
- 상대 경로 OG image의 절대 주소는 `metadataBase`를 두지 않고 Next 기본값(Vercel 배포 설정)에 맡긴다. 운영은 `VERCEL_PROJECT_PRODUCTION_URL`, 미리보기 배포는 `VERCEL_BRANCH_URL`·`VERCEL_URL`, 개발은 localhost다(next 16.4.6 `resolve-url.js` 확인, #442). 요청 헤더(Host·`x-forwarded-host`)로 만들지 않는다. 배포 뒤에는 실제 링크의 `og:image`가 운영 도메인인지 확인한다(시스템 환경 변수가 실행 시점에 없으면 localhost가 된다).

## Crawling assets

- 색인 대상은 로그인(`/login`, 서비스 첫 화면) 하나다(2026-11-24). 운영 주소는 `https://app.bunch.kr`(`shared/constants/site.ts`의 `SITE_ORIGIN`, 주소·스토어 정보는 이 파일에 모음)이고, `app/sitemap.ts`에는 로그인만, `app/robots.ts`는 BFF(`/api/`)만 빼고 수집을 연다. 수집을 막으면 페이지의 `noindex`를 읽지 못해 외부에 걸린 링크가 URL만 색인될 수 있어서, 색인은 각 페이지의 `noindex`로 막는다. 가짜 서버를 켠 빌드는 전부 막는다.
- 검색 엔진도 브라우저라서 로그인(`/login`)을 렌더하면 앱 설치 안내(제목 「함께한 순간은 휴대폰에서 모여요」)를 본다. 서버 HTML에는 접근 가드의 로딩만 있고 안내는 hydration 뒤에 그려진다. 운영 Lighthouse가 재는 `/intro`도 같은 안내 화면이다.
- 서비스 이름은 앱스토어와 웹 모두 `BUNCH`다(`SITE_NAME`, 로고 그림만 소문자 `bunch`). 로그인 화면의 제목은 `BUNCH - 함께한 순간이 모이는 곳`, 설명은 슬로건(`SITE_SLOGAN`), canonical은 운영 절대 주소, 공유 이미지는 공용 OG 이미지(`public/images/og/default.png`, Figma 「오픈그래프 이미지」 슬로건판 1800×945, `SITE_OG_IMAGE`)다. root layout도 같은 이미지를 기본 미리보기로 두고, 초대장은 전용 이미지(`invite.png`)로 덮어쓴다. 그 밖의 로그인 뒤 화면은 각 route에서 `noindex`를 둔다.
- 검색 등록 확인 태그는 root layout이 `GOOGLE_SITE_VERIFICATION`·`NAVER_SITE_VERIFICATION`(서버 환경 변수)으로 넣는다. 정적 화면은 빌드할 때 값을 넣으므로 운영 값은 GitHub environment `production`의 variable로 두고 `web-deploy.yml` 빌드 단계가 넘긴다(Vercel 프로젝트 변수는 빌드에 닿지 않음). 비면 태그를 넣지 않는다. 로그인은 `og:url`·`og:locale`(`ko_KR`)과 Safari 앱 배너(`itunes.appId`)를 둔다.
- 초대장(`/invite/[token]`)은 토큰이 든 주소라 `noindex`로 두고 수집만 허용한다. 공유 미리보기(제목·설명·OG 이미지)가 이 화면의 목적이다(`docs/workflows/invite-link-entry.md`).
- 탭 아이콘은 `app/favicon.ico`(16·32·48)와 `public/icons`의 PNG다. 앱 아이콘이 바뀌면 함께 다시 만든다(`docs/workflows/web-deployment.md`).
- 인증, 개인 데이터, preview 전용 route는 sitemap에 넣지 않는다.
- 새 공개 페이지는 heading 구조, 의미 있는 이미지 alt, 공유 미리보기 metadata를 함께 확인한다.

## Verification

- metadata를 바꾼 route는 `yarn workspace @app/web typecheck`로 확인한다.
- 배포 전에는 production URL의 title, description, canonical, OG preview와 robots·sitemap 응답을 확인한다.
