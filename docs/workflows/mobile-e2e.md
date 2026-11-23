# 쉘 E2E(Maestro)

앱 쉘 핵심 흐름을 iOS 시뮬레이터에서 Maestro로 확인하는 방법이다(결정 기록 029). 개발 앱 실행은 [mobile-testing.md](mobile-testing.md)를 본다.

앱 쉘의 핵심 흐름(실행·탭 전환·탭 밖 화면·백그라운드 복귀·키보드·번치 탭 꾹 누르기와 두 번 누르기)은 Maestro로 iOS 시뮬레이터에서 확인한다(결정 기록 029). flow는 `apps/mobile-shell/maestro/`에 있다.

준비: Xcode·iOS 시뮬레이터, Java, [Maestro CLI](https://github.com/mobile-dev-inc/maestro/releases)(CI와 같은 2.12.1). Maestro는 저장소 의존성이 아니라 각자 설치한다.

```bash
# 터미널 1: 저장소 루트. 가짜 서버(MSW)를 켠 웹 운영 빌드를 127.0.0.1:3200에 띄움
NEXT_PUBLIC_API_MOCKING=enabled SENTRY_AUTH_TOKEN= NEXT_PUBLIC_SENTRY_DSN= yarn workspace @app/web build
NEXT_PUBLIC_API_MOCKING=enabled yarn workspace @app/web exec next start --hostname 127.0.0.1 --port 3200

# 터미널 2: apps/mobile-shell. E2E 빌드를 만들어 켜 둔 시뮬레이터에 설치하고 flow 실행
pnpm ios:sync:clean
pnpm e2e:ios:build
xcrun simctl install booted build/e2e/Build/Products/Release-iphonesimulator/Bunch.app
pnpm e2e:ios
```

- E2E 빌드는 `EXPO_PUBLIC_E2E=1`로 같은 기기의 http 웹만 열 수 있게 만든 Release 빌드다. 스토어 빌드에 쓰지 않으며, EAS production 빌드에 이 값이 있으면 `app.config.js`가 빌드를 멈춘다. EAS를 거치지 않는 Release 빌드(Xcode Archive 등)는 막지 않으므로 `.env.local`에 이 값을 남기지 않는다.
- flow는 웹이 정한 문구(탭 이름 등)로 판정해 시뮬레이터 언어와 관계없이 같은 결과를 낸다. 시스템 문구(예: 「탭 막대」)는 판정에 쓰지 않는다.
- 가짜 DB가 로그인·가입 완료 상태로 시작하고, 각 flow는 `clearState`로 저장된 상태 없이 시작한다.
- `known-issue` 태그 flow는 아직 고치지 않은 문제를 재현하므로 기본 실행에서 빠진다(`config.yaml`의 `excludeTags`). 따로 돌릴 때는 파일 경로로 실행한다(태그로 고르면 `excludeTags`와 겹쳐 아무 flow도 고르지 않음). 지금은 해당 flow가 없다: 시작 직후 입력 무시(`90-startup-first-input.yaml`)를 #520에서 고쳐 기본 실행에 넣었고, CI의 별도 확인 단계도 지웠다(2026-11-23). 다시 생기면 job을 막지 않는 단계를 둔다.
- 시뮬레이터는 실기기와 입력·렌더 속도가 달라, 통과해도 실기기 확인을 대신하지 않는다.
- 시스템 탭 바의 탭은 이름이 아니라 탭 버튼의 식별자로 고른다(`id: 'tab-bunch'`, 쉘 `app/(tabs)/_layout.tsx`의 `NativeTabs.Trigger` `testID`가 iOS accessibility identifier가 됨). 탭 화면 전체가 탭 이름과 같은 접근성 이름을 가져, 이름만 쓰면 Maestro가 화면 전체를 골라 그 가운데(번치 홈 그리드 칸)를 누른다(2026-11-24 CI, 번치 탭 꾹 누르기·두 번 누르기 flow가 번들 상세로 넘어가 실패). 첫 입력 재시도도 탭은 `subflows/tap-tab-until-visible.yaml`(`TAB_ID`)로, 웹 화면 안 요소만 `tap-until-visible.yaml`(`TARGET`)로 누른다. 시스템이 붙이는 탭 바 이름(`Tab Bar`)은 시뮬레이터 언어에 따라 바뀌어 쓰지 않는다.
- 처음 보이는 탭 WebView는 CI 시뮬레이터에서 그리기가 5초 넘게 걸린 기록이 있다. 화면 요소를 기다리는 상한은 10초 이상으로 둔다(입력이 무시되는 문제는 상한과 상관없이 실패로 잡힘).
- 실행 기록·스크린샷은 `~/.maestro/tests/`에 남는다. 개인정보가 없는 가짜 데이터지만 공유할 때는 필요한 화면만 고른다.
