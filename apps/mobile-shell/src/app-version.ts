import Constants from 'expo-constants';
import { appVersionSchema, type AppVersion } from '@app/bridge';

/**
 * 빌드에 들어간 `app.json`의 버전과 iOS 빌드 번호(지금 배포 방식인 Xcode Archive 기준, EAS 자동 번호는 반영 안 됨)
 * 값이 없거나 형식이 다르면 reject(웹은 값을 받지 못해 막지 않음). 안드로이드는 출시 전이라 iOS 값만 읽음
 */
export const getAppVersion = async (): Promise<AppVersion> => {
  const config = Constants.expoConfig;
  return appVersionSchema.parse({ version: config?.version, build: config?.ios?.buildNumber });
};
