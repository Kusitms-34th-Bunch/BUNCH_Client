import { pushDeviceRegistrationSchema, type PushDeviceRegistration } from '@app/bridge';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createPushDeviceReader } from './push-device-core';

// 설치별 UUID를 앱 문서 폴더에 저장(앱을 지우면 함께 지워져 새 설치로 봄). 계정이 바뀌어도 같은 값을 씀
const installationFile = () => new File(Paths.document, 'push-installation-id.txt');
const installationIdSchema = pushDeviceRegistrationSchema.shape.installationId;

/** 저장된 설치 ID. 없거나 잘못됐거나 읽지 못하면 null */
const readInstallationId = async (): Promise<string | null> => {
  try {
    const file = installationFile();
    if (!file.exists) return null;
    const parsed = installationIdSchema.safeParse((await file.text()).trim());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const createInstallationId = async (): Promise<string | null> => {
  try {
    const id = Crypto.randomUUID();
    const file = installationFile();
    if (!file.exists) file.create();
    await file.write(id);
    return id;
  } catch {
    return null;
  }
};

const readPushDevice = createPushDeviceReader({
  isIos: Platform.OS === 'ios',
  isDev: __DEV__,
  readInstallationId,
  createInstallationId,
  readIosPermissionStatus: async () => (await Notifications.getPermissionsAsync()).ios?.status,
  readDeviceToken: async () => (await Notifications.getDevicePushTokenAsync()).data,
});

/**
 * bridge `getPushDeviceRegistration`의 쉘 구현: 서버 푸시 기기 등록에 쓸 설치 ID·APNs 토큰·환경·알림 권한 상태
 * iOS가 아니거나 토큰을 받지 못하면 null. 서버 계약(`pushDeviceRegistrationSchema`)에 맞지 않는 값은 보내지 않고 null
 * 토큰은 로그·오류에 남기지 않음
 */
export async function getPushDeviceRegistration(): Promise<PushDeviceRegistration | null> {
  const info = await readPushDevice();
  if (!info) return null;
  const parsed = pushDeviceRegistrationSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
}

/** bridge `getPushInstallationId`의 쉘 구현: 토큰을 얻지 않고 저장된 설치 ID만 읽음(로그아웃 때 서버에서 이 기기를 해제하는 데 씀) */
export async function getPushInstallationId(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  return readInstallationId();
}
