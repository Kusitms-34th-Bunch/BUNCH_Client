// 푸시 기기 등록 정보를 만드는 순수 로직(React Native 모듈 없음, Node 테스트로 확인)
// 서버 계약(`PUT /members/me/push-devices/{installationId}`)이 APNs 기준이라 iOS만 다룸

export type PushEnvironment = 'SANDBOX' | 'PRODUCTION';
export type PushAuthorizationStatus = 'NOT_DETERMINED' | 'DENIED' | 'AUTHORIZED' | 'PROVISIONAL';

export type PushDeviceInfo = {
  installationId: string;
  deviceToken: string;
  environment: PushEnvironment;
  authorizationStatus: PushAuthorizationStatus;
};

const HEX_PAIRS = /^(?:[0-9a-fA-F]{2})+$/;

/** APNs 기기 토큰인지: 16진수 짝수 길이 2~4096자(서버 계약과 같은 규칙) */
export const isApnsToken = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 2 && value.length <= 4096 && HEX_PAIRS.test(value);

/** expo-notifications의 `IosAuthorizationStatus`(NOT_DETERMINED 0, DENIED 1, AUTHORIZED 2, PROVISIONAL 3, EPHEMERAL 4)를 서버 값으로 */
export const toAuthorizationStatus = (iosStatus: number | undefined): PushAuthorizationStatus => {
  switch (iosStatus) {
    case 1:
      return 'DENIED';
    case 2:
    // 앱 클립의 임시 허용(EPHEMERAL)은 알림을 받을 수 있는 상태라 허용으로 봄
    case 4:
      return 'AUTHORIZED';
    case 3:
      return 'PROVISIONAL';
    default:
      return 'NOT_DETERMINED';
  }
};

/** 개발 빌드는 APNs 샌드박스, 배포 빌드는 운영 */
export const toPushEnvironment = (isDev: boolean): PushEnvironment =>
  isDev ? 'SANDBOX' : 'PRODUCTION';

export type PushDeviceDeps = {
  isIos: boolean;
  isDev: boolean;
  /** 저장된 설치 ID. 없거나 읽지 못하면 null */
  readInstallationId: () => Promise<string | null>;
  /** 새 설치 ID를 만들어 저장하고 돌려줌. 저장하지 못하면 null(저장하지 못한 ID를 쓰면 호출마다 다른 기기로 등록됨) */
  createInstallationId: () => Promise<string | null>;
  /** OS 알림 권한 상태(iOS 숫자 코드). 읽지 못하면 undefined */
  readIosPermissionStatus: () => Promise<number | undefined>;
  /** APNs 기기 토큰. 받지 못하면 reject */
  readDeviceToken: () => Promise<unknown>;
};

/**
 * 이 기기의 푸시 등록 정보를 만듦. iOS가 아니거나 토큰·설치 ID를 얻지 못하면 null
 * 토큰은 기기를 가리키는 값이라 어떤 오류·로그에도 넣지 않고, 실패는 모두 null로만 알림
 * 같은 시점에 겹쳐 부르면 한 번만 읽고 결과를 함께 씀(앱 시작·앞으로 돌아옴이 겹쳐도 토큰을 여러 번 요청하지 않음)
 */
export const createPushDeviceReader = (deps: PushDeviceDeps) => {
  let inFlight: Promise<PushDeviceInfo | null> | undefined;

  const read = async (): Promise<PushDeviceInfo | null> => {
    if (!deps.isIos) return null;
    try {
      // 토큰을 먼저 받음: 못 받는 기기(시뮬레이터 등)에서 설치 ID를 만들어 두지 않기 위해
      const deviceToken = await deps.readDeviceToken();
      if (!isApnsToken(deviceToken)) return null;
      const installationId =
        (await deps.readInstallationId()) ?? (await deps.createInstallationId());
      if (!installationId) return null;
      return {
        installationId,
        deviceToken,
        environment: toPushEnvironment(deps.isDev),
        authorizationStatus: toAuthorizationStatus(await deps.readIosPermissionStatus()),
      };
    } catch {
      return null;
    }
  };

  return () => {
    inFlight ??= read().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
};
