// ios/ 동기화. 기본은 기존 폴더에 바뀐 것만 반영(--no-clean)하고, Pods 입력이 바뀐 경우에만 pod install
// pod install은 다음 빌드를 크게 늘려서(약 200초) 필요할 때만 실행. `--clean`이면 ios/를 새로 만듦(pod install 포함)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

process.env.DEVELOPER_DIR ||= '/Applications/Xcode.app/Contents/Developer';
const STAMP = 'ios/.pods-lock-hash';
// 앱 안 네이티브 모듈(modules/*)을 더하거나 설정·소스 파일을 바꿔도 lock은 그대로라 이것도 입력으로 봄
const localModuleInputs = () =>
  existsSync('modules')
    ? readdirSync('modules', { recursive: true })
        .map(String)
        // 설정·podspec 내용과 ios 소스 파일 목록(podspec의 소스 경로는 pod install 때 펼쳐져 새 파일도 다시 설치해야 함)
        .filter(
          (path) =>
            path.endsWith('expo-module.config.json') ||
            path.endsWith('.podspec') ||
            isModuleSource(path),
        )
        .sort()
        .map((path) => `modules/${path}`)
    : [];
const POD_INPUTS = () => [
  'pnpm-lock.yaml',
  'ios/Podfile',
  'ios/Podfile.properties.json',
  ...localModuleInputs(),
];
const run = (cmd, args, cwd) => execFileSync(cmd, args, { stdio: 'inherit', cwd });
const readOrEmpty = (path) => (existsSync(path) ? readFileSync(path) : '');
// 소스 파일은 있고 없음(경로)만 봄. 내용까지 보면 코드를 고칠 때마다 pod install(약 200초)이 돎
const isModuleSource = (path) => /\/ios\/.+\.(swift|m|mm|h)$/.test(path);
const podInputsHash = () => {
  const hash = createHash('sha256');
  for (const path of POD_INPUTS())
    hash
      .update(path)
      .update('\0')
      .update(isModuleSource(path) ? '' : readOrEmpty(path))
      .update('\0');
  return hash.digest('hex');
};

if (process.argv.includes('--clean') || !existsSync('ios')) {
  // 새로 만들 때는 prebuild가 pod install까지 함
  run('pnpm', ['exec', 'expo', 'prebuild', '--platform', 'ios']);
} else {
  run('pnpm', ['exec', 'expo', 'prebuild', '--platform', 'ios', '--no-clean']);
  // prebuild는 직접 추가한 네이티브 패키지를 감지하지 못해 pod install을 건너뜀
  if (readOrEmpty(STAMP).toString() !== podInputsHash()) run('pod', ['install'], 'ios');
}

// prebuild는 Info.plist에만 버전을 씀. Xcode General 탭이 보여 주는 빌드 설정도 app.json 값으로 맞춤(템플릿 1.0이 남아 헷갈리지 않게)
const { expo } = JSON.parse(readFileSync('app.json', 'utf8'));
const PBXPROJ = 'ios/Bunch.xcodeproj/project.pbxproj';
if (existsSync(PBXPROJ)) {
  writeFileSync(
    PBXPROJ,
    readFileSync(PBXPROJ, 'utf8')
      .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${expo.version};`)
      .replace(
        /CURRENT_PROJECT_VERSION = [^;]+;/g,
        `CURRENT_PROJECT_VERSION = ${expo.ios.buildNumber};`,
      ),
  );
}

// Xcode 셸 단계(Sentry 소스맵 업로드)는 앱 폴더 .env.local을 읽지 않음. 토큰 값은 복사하지 않고 빌드 때 읽게 하는 줄만 넣음
const XCODE_ENV_LOCAL = 'ios/.xcode.env.local';
const SENTRY_ENV_MARKER = '# Sentry 소스맵 업로드 토큰';
// 파일은 pod install이 NODE_BINARY와 함께 만듦(먼저 만들면 pod install이 NODE_BINARY를 쓰지 않음)
if (
  existsSync(XCODE_ENV_LOCAL) &&
  !readOrEmpty(XCODE_ENV_LOCAL).toString().includes(SENTRY_ENV_MARKER)
) {
  appendFileSync(
    XCODE_ENV_LOCAL,
    [
      '',
      `${SENTRY_ENV_MARKER}: 앱 폴더 .env.local에서 읽음(Xcode 셸 단계는 .env.local을 읽지 않음)`,
      'if [ -z "$SENTRY_AUTH_TOKEN" ] && [ -f "$PROJECT_DIR/../.env.local" ]; then',
      `  export SENTRY_AUTH_TOKEN="$(grep -E '^(export +)?SENTRY_AUTH_TOKEN=' "$PROJECT_DIR/../.env.local" | head -1 | cut -d= -f2- | tr -d '"'"'"'\\r')"`,
      'fi',
      '',
    ].join('\n'),
  );
}

// TestFlight 테스터용 빌드(`--staging`)만 개발 서버 표시를 켜고, 아니면 지움(심사·출시 빌드에 남지 않게, #581)
const STAGING_LINE = 'export EXPO_PUBLIC_API_ENV=staging # pnpm ios:sync --staging';
const staging = process.argv.includes('--staging');
if (existsSync(XCODE_ENV_LOCAL)) {
  const lines = readOrEmpty(XCODE_ENV_LOCAL)
    .toString()
    .split('\n')
    .filter((line) => line !== STAGING_LINE);
  writeFileSync(XCODE_ENV_LOCAL, [...lines, ...(staging ? [STAGING_LINE] : [])].join('\n'));
}
if (staging && !existsSync(XCODE_ENV_LOCAL)) {
  // 표시를 넣지 못하면 테스터 빌드가 운영 서버에 붙으므로 Archive 전에 멈춤
  console.error(
    `${XCODE_ENV_LOCAL}이 없어 개발 서버 표시를 넣지 못했어요. pod install을 확인한 뒤 다시 실행하세요.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    staging
      ? '이번 Archive: TestFlight 테스터용(개발 서버). 심사 제출용은 `pnpm ios:sync`로 다시 맞추세요.'
      : '이번 Archive: 심사·출시용(운영 서버).',
  );
}

// Expo의 pod install은 실패해도 경고만 내므로, CocoaPods가 끝까지 설치한 경우(두 lock이 같음)에만 기록
const podsInstalled =
  existsSync('ios/Podfile.lock') &&
  readOrEmpty('ios/Podfile.lock').toString() === readOrEmpty('ios/Pods/Manifest.lock').toString();
if (podsInstalled) writeFileSync(STAMP, podInputsHash());
else {
  rmSync(STAMP, { force: true });
  console.warn(
    'pod install이 끝나지 않았어요. `cd ios && pod install`을 확인한 뒤 다시 실행하세요.',
  );
  process.exitCode = 1;
}
