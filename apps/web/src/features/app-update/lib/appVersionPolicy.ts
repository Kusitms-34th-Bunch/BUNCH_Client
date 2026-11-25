import type { AppVersion } from '@app/bridge';

/**
 * 이 버전·빌드보다 낮은 앱은 업데이트 모달로 막음(iOS, #577)
 * 새 버전이 App Store에서 「판매 중」이 된 뒤에 올림(심사 중에 올리면 받을 업데이트가 없음)
 */
export const MINIMUM_APP_VERSION: AppVersion = { version: '1.1.1', build: '1' };

/** `getAppVersion`이 없는 마지막 앱(1.1.1 빌드 1). 이전 쉘은 이 버전으로 보고 비교 */
export const LAST_LEGACY_APP_VERSION: AppVersion = { version: '1.1.1', build: '1' };

/** `1.2` 같은 짧은 표기는 빈 자리를 0으로 보고 앞자리부터 비교 */
const compareVersions = (a: string, b: string) => {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
};

/** 앱 버전(이전 쉘은 `legacy`)이 최소 버전보다 낮은지 */
export const isUpdateRequired = (app: AppVersion | 'legacy', minimum = MINIMUM_APP_VERSION) => {
  const installed = app === 'legacy' ? LAST_LEGACY_APP_VERSION : app;
  const byVersion = compareVersions(installed.version, minimum.version);
  return byVersion < 0 || (byVersion === 0 && Number(installed.build) < Number(minimum.build));
};
