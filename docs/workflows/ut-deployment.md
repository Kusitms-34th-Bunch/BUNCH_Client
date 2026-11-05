# UT 배포(Vercel)와 홈 화면 앱(PWA)

UT 시나리오와 가짜 서버 세팅은 [usability-test.md](./usability-test.md)를 본다.

UT는 가짜 서버(서비스 워커)가 필요해 **브라우저·홈 화면 앱(PWA)** 으로 진행한다. 네이티브 쉘(Expo)의 WebView에서는 서비스 워커를 쓸 수 없어(`mocks/browser.ts` 주석) 가짜 서버가 켜지지 않는다.

## 배포

1. Vercel 팀 계정에 **UT 전용 프로젝트**를 만든다(운영과 분리). 저장소를 연결하거나 Vercel CLI(`vercel link`, `vercel --prod`)로 배포한다.
2. 빌드 환경 변수로 `NEXT_PUBLIC_API_MOCKING=enabled`를 넣는다. 빌드 때 값이 코드에 들어가므로 바꾸면 **다시 배포**해야 한다. 운영 배포에는 넣지 않는다(켜면 진행자 장치와 가짜 DB 초기화가 노출됨).
3. 참여자 폰에서 열려야 하므로 Deployment Protection(로그인 보호)을 확인한다. 미리보기 주소는 기본으로 보호되어 열리지 않을 수 있어 프로덕션 도메인을 쓰거나 보호를 끈다.
4. 모노레포(Yarn 4 PnP) 빌드 설정(Root Directory, 설치·빌드 명령)은 처음 배포하면서 확인하고 이 문서에 적는다. 아직 확인하지 않았다.
5. UT 빌드(`NEXT_PUBLIC_API_MOCKING=enabled`)는 검색에 노출되지 않도록 `noindex`가 켜진다(`app/layout.tsx`).

배포 뒤 확인할 것: 주소가 폰에서 열린다, 개발자 도구(또는 원격 디버깅)에서 서비스 워커가 등록된다, `/manifest.webmanifest`가 응답한다, 번치 홈에 「여행쥬아」와 기존 번들 2개가 보인다(가짜 서버가 켜진 증거).

## 홈 화면 추가

- 앱 이름은 **bunch**다(`app/manifest.ts`의 `name`·`short_name`, iOS는 `app/layout.tsx`의 `appleWebApp.title`).
- 설치한 앱은 `/bunch`(번치 홈)에서 시작하고 주소창 없이(`display: standalone`) 세로로 열린다.
- 아이콘은 확정 전이라 **임시 이미지**(브랜드 색 바탕에 흰 원)다. 실제 아이콘이 오면 `apps/web/public/icons`의 같은 파일명으로 교체한다.

| 파일                           | 크기      | 쓰이는 곳                                                        |
| ------------------------------ | --------- | ---------------------------------------------------------------- |
| `icon-192.png`, `icon-512.png` | 192·512px | Android 설치 아이콘(매니페스트)                                  |
| `icon-maskable-512.png`        | 512px     | Android 적응형 아이콘(가장자리가 잘려도 되게 중앙 80% 안에 그림) |
| `apple-touch-icon.png`         | 180px     | iOS 홈 화면 아이콘(iOS는 매니페스트 아이콘을 쓰지 않음)          |

- iOS: Safari 공유 메뉴 → 「홈 화면에 추가」. Android: Chrome 메뉴 → 「앱 설치」 또는 「홈 화면에 추가」.
- **저장소가 분리된다**: 브라우저 탭에서 쌓은 가짜 DB와 홈 화면 앱의 가짜 DB는 서로 다르다. 참여자가 쓸 방식 하나로 통일하고, 초기화·리허설도 같은 방식으로 한다.
- 매니페스트와 아이콘 파일의 존재는 자동 테스트(`app/manifest.test.ts`)가 확인한다. 실제 기기에서 홈 화면에 추가했을 때 이름·아이콘이 의도대로 보이는지, 주소창이 없는지는 아직 확인하지 않았다(실기기 리허설에서 확인).
