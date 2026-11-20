// Maestro E2E용 iOS 시뮬레이터 Release 빌드(결정 기록 029). JS가 앱에 들어가 Metro 없이 실행됨
// 같은 기기에 띄운 가짜 서버 웹(기본 http://127.0.0.1:3200)을 열도록 EXPO_PUBLIC_E2E=1로 빌드함. 스토어 빌드에 쓰지 않음
import { execFileSync } from 'node:child_process';

process.env.DEVELOPER_DIR ||= '/Applications/Xcode.app/Contents/Developer';
const webUrl = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3200';
const env = {
  ...process.env,
  EXPO_PUBLIC_E2E: '1',
  EXPO_PUBLIC_WEB_URL: webUrl,
  // 소스맵 업로드·Sentry 전송 없음(E2E 빌드는 배포하지 않음)
  SENTRY_DISABLE_AUTO_UPLOAD: 'true',
  EXPO_PUBLIC_SENTRY_DSN: '',
};
const run = (cmd, args, cwd) => execFileSync(cmd, args, { stdio: 'inherit', cwd, env });

run(
  'xcodebuild',
  [
    '-workspace',
    'Bunch.xcworkspace',
    '-scheme',
    'Bunch',
    '-configuration',
    'Release',
    '-sdk',
    'iphonesimulator',
    '-destination',
    'generic/platform=iOS Simulator',
    '-derivedDataPath',
    '../build/e2e',
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ],
  'ios',
);
console.log('E2E 앱: build/e2e/Build/Products/Release-iphonesimulator/Bunch.app');
