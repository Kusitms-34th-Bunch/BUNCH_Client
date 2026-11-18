import { pushDeviceRegistrationSchema } from '@app/bridge';
import { registerPushDevice, unregisterPushDevice } from '../api/pushDevices';
import { isNativeShell, pushDeviceBridge } from '../bridge/client';

/** 마지막으로 서버에 등록한 정보의 서명. 같으면 다시 보내지 않음(메모리에만 두고 저장·로그하지 않음, 문서를 새로 열면 사라짐) */
let lastSynced: string | null = null;
// 계정·세션이 바뀌거나 해제할 때 올라가는 세대. 등록 요청 도중 바뀌면 그 결과를 기록하지 않음(해제 직후 기록이 되살아나는 것을 막음)
let generation = 0;
let inFlight: Promise<PushSyncResult> | undefined;
// 로그아웃 해제 중에는 새 등록을 시작하지 않음(해제 뒤에 등록이 도착해 기기가 남는 것을 막음)
let releasing = false;

export type PushSyncResult = 'unavailable' | 'skipped' | 'synced' | 'failed';

const signature = (registration: {
  installationId: string;
  deviceToken: string;
  environment: string;
  authorizationStatus: string;
}) =>
  [
    registration.installationId,
    registration.deviceToken,
    registration.environment,
    registration.authorizationStatus,
  ].join('|');

const sync = async (): Promise<PushSyncResult> => {
  try {
    if (releasing) return 'skipped';
    // 쉘이 bridge 메서드 목록을 알려 주기 전이거나 푸시 등록을 모르는 오래된 쉘이면 아직 할 수 없음
    if (
      !isNativeShell() ||
      !pushDeviceBridge.isNativeMethodAvailable('getPushDeviceRegistration')
    ) {
      return 'unavailable';
    }
    // 쉘 응답을 계약으로 다시 확인(null·형식 오류는 등록할 기기가 없는 것으로 봄)
    const parsed = pushDeviceRegistrationSchema.safeParse(
      await pushDeviceBridge.getPushDeviceRegistration(),
    );
    if (!parsed.success) return 'skipped';
    const key = signature(parsed.data);
    if (key === lastSynced) return 'skipped';
    const startedAt = generation;
    await registerPushDevice(parsed.data);
    if (startedAt === generation) lastSynced = key;
    return 'synced';
  } catch {
    // 푸시 등록 실패가 앱 사용을 막지 않음. 다음 기회(앞으로 돌아올 때)에 다시 시도하고, 오류에는 토큰이 들어갈 수 있어 남기지 않음
    return 'failed';
  }
};

/**
 * 마지막 등록 기록을 지움. 계정·세션이 바뀌면(로그아웃 없이 세션이 끝난 뒤 다른 계정으로 로그인하는 경우 포함) 서명이 같아도 새로 등록해야 해서 호출함
 * 서버는 계정·세션이 바뀌면 이전 바인딩의 대기 푸시를 취소하고 새로 바인딩함(Notion 푸시 기기 등록·갱신)
 */
export const resetPushDeviceSync = () => {
  generation += 1;
  lastSynced = null;
};

/**
 * 이 기기를 서버에 등록(앱 시작·앞으로 돌아올 때 호출). 서버 값과 같으면 보내지 않고, 겹쳐 부르면 하나로 합침
 * 앱 권한 변경·토큰 갱신도 다음 호출에서 값이 달라져 다시 등록됨(기능명세서 7.5.2, Notion 푸시 기기 등록·갱신)
 */
export const syncPushDevice = (): Promise<PushSyncResult> => {
  inFlight ??= sync().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
};

// 로그아웃이 오래 걸리지 않도록 해제 대기 상한
const RELEASE_TIMEOUT_MS = 3000;

/**
 * 로그아웃 때 서버에서 이 기기를 해제해 이 기기로 푸시가 가지 않게 함(기능명세서 7.5.2 로직 1)
 * 인증이 필요하므로 세션을 지우기 전에 호출함. 어떤 실패·시간 초과도 던지지 않아 로그아웃을 막지 않음
 */
export const releasePushDevice = async (): Promise<void> => {
  resetPushDeviceSync();
  releasing = true;
  const release = async () => {
    // 진행 중인 등록이 있으면 끝난 뒤에 해제해, 늦게 도착한 등록이 해제를 덮어쓰지 않게 함
    await inFlight;
    if (!isNativeShell() || !pushDeviceBridge.isNativeMethodAvailable('getPushInstallationId')) {
      return;
    }
    const installationId = await pushDeviceBridge.getPushInstallationId();
    if (installationId) await unregisterPushDevice(installationId);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, RELEASE_TIMEOUT_MS);
  });
  try {
    await Promise.race([release().catch(() => undefined), timeout]);
  } finally {
    clearTimeout(timer);
    releasing = false;
  }
};
