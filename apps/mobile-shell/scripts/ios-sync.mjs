// ios/ 동기화. 기본은 기존 폴더에 바뀐 것만 반영(--no-clean)하고, Pods 입력이 바뀐 경우에만 pod install
// pod install은 다음 빌드를 크게 늘려서(약 200초) 필요할 때만 실행. `--clean`이면 ios/를 새로 만듦(pod install 포함)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

process.env.DEVELOPER_DIR ||= '/Applications/Xcode.app/Contents/Developer';
const STAMP = 'ios/.pods-lock-hash';
const POD_INPUTS = ['pnpm-lock.yaml', 'ios/Podfile', 'ios/Podfile.properties.json'];
const run = (cmd, args, cwd) => execFileSync(cmd, args, { stdio: 'inherit', cwd });
const readOrEmpty = (path) => (existsSync(path) ? readFileSync(path) : '');
const podInputsHash = () => {
  const hash = createHash('sha256');
  for (const path of POD_INPUTS) hash.update(readOrEmpty(path)).update('\0');
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
