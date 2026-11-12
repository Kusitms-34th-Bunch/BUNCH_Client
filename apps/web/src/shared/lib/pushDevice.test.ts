import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const UUID = 'b37d231c-5a60-4cf8-a83c-ae4b704154b7';
const registration = {
  installationId: UUID,
  deviceToken: 'aabbccdd',
  environment: 'SANDBOX',
  authorizationStatus: 'AUTHORIZED',
} as const;

const mocks = vi.hoisted(() => ({
  isNativeShell: vi.fn(() => true),
  isNativeMethodAvailable: vi.fn((_method: string) => true),
  getPushDeviceRegistration: vi.fn<() => Promise<unknown>>(),
  getPushInstallationId: vi.fn<() => Promise<unknown>>(),
  registerPushDevice: vi.fn<(_registration: unknown) => Promise<unknown>>(),
  unregisterPushDevice: vi.fn<(_installationId: string) => Promise<void>>(),
}));
vi.mock('../bridge/client', () => ({
  isNativeShell: mocks.isNativeShell,
  pushDeviceBridge: {
    isNativeMethodAvailable: mocks.isNativeMethodAvailable,
    getPushDeviceRegistration: mocks.getPushDeviceRegistration,
    getPushInstallationId: mocks.getPushInstallationId,
  },
}));
vi.mock('../api/pushDevices', () => ({
  registerPushDevice: mocks.registerPushDevice,
  unregisterPushDevice: mocks.unregisterPushDevice,
}));

// 마지막 등록 정보를 모듈이 기억하므로 테스트마다 새로 불러옴
const load = async () => import('./pushDevice');

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.isNativeShell.mockReturnValue(true);
  mocks.isNativeMethodAvailable.mockReturnValue(true);
  mocks.getPushDeviceRegistration.mockResolvedValue(registration);
  mocks.getPushInstallationId.mockResolvedValue(UUID);
  mocks.registerPushDevice.mockResolvedValue({});
  mocks.unregisterPushDevice.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe('등록 기록 초기화', () => {
  it('초기화하면 같은 값이어도 다시 등록한다(세션·계정이 바뀐 경우)', async () => {
    const { syncPushDevice, resetPushDeviceSync } = await load();

    expect(await syncPushDevice()).toBe('synced');
    expect(await syncPushDevice()).toBe('skipped');
    resetPushDeviceSync();
    expect(await syncPushDevice()).toBe('synced');
    expect(mocks.registerPushDevice).toHaveBeenCalledTimes(2);
  });

  it('등록 요청 도중 초기화되면 그 결과를 기록하지 않는다', async () => {
    const { syncPushDevice, resetPushDeviceSync } = await load();
    let finish: (_value: unknown) => void = () => undefined;
    mocks.registerPushDevice.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const pending = syncPushDevice();
    await vi.waitFor(() => expect(mocks.registerPushDevice).toHaveBeenCalled());
    resetPushDeviceSync();
    finish({});
    await pending;

    expect(await syncPushDevice()).toBe('synced');
  });

  it('해제는 진행 중인 등록이 끝난 뒤에 보낸다', async () => {
    const { syncPushDevice, releasePushDevice } = await load();
    const order: string[] = [];
    let finish: (_value: unknown) => void = () => undefined;
    mocks.registerPushDevice.mockImplementationOnce(
      () => new Promise((resolve) => (finish = (v) => (order.push('register'), resolve(v)))),
    );
    mocks.unregisterPushDevice.mockImplementation(() => {
      order.push('unregister');
      return Promise.resolve();
    });

    void syncPushDevice();
    await vi.waitFor(() => expect(mocks.registerPushDevice).toHaveBeenCalled());
    const released = releasePushDevice();
    finish({});
    await released;

    expect(order).toEqual(['register', 'unregister']);
  });
});

describe('해제 중 등록', () => {
  it('해제가 진행 중이면 새 등록을 시작하지 않고, 끝나면 다시 등록할 수 있다', async () => {
    const { syncPushDevice, releasePushDevice } = await load();
    let finish: () => void = () => undefined;
    mocks.unregisterPushDevice.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );

    const released = releasePushDevice();
    await vi.waitFor(() => expect(mocks.unregisterPushDevice).toHaveBeenCalled());
    expect(await syncPushDevice()).toBe('skipped');
    expect(mocks.registerPushDevice).not.toHaveBeenCalled();
    finish();
    await released;

    expect(await syncPushDevice()).toBe('synced');
  });
});

describe('syncPushDevice', () => {
  it('쉘이 아니거나 쉘이 아직 메서드 목록을 알려 주지 않았으면 아직 할 수 없다고 알린다', async () => {
    const { syncPushDevice } = await load();

    mocks.isNativeShell.mockReturnValue(false);
    expect(await syncPushDevice()).toBe('unavailable');

    mocks.isNativeShell.mockReturnValue(true);
    mocks.isNativeMethodAvailable.mockReturnValue(false);
    expect(await syncPushDevice()).toBe('unavailable');
    expect(mocks.getPushDeviceRegistration).not.toHaveBeenCalled();
  });

  it('쉘의 기기 정보를 서버에 등록한다', async () => {
    const { syncPushDevice } = await load();

    expect(await syncPushDevice()).toBe('synced');

    expect(mocks.registerPushDevice).toHaveBeenCalledWith(registration);
  });

  it('등록할 기기가 없으면(null·계약에 어긋난 값) 요청을 보내지 않는다', async () => {
    const { syncPushDevice } = await load();

    mocks.getPushDeviceRegistration.mockResolvedValue(null);
    expect(await syncPushDevice()).toBe('skipped');

    mocks.getPushDeviceRegistration.mockResolvedValue({ ...registration, deviceToken: 'xyz' });
    expect(await syncPushDevice()).toBe('skipped');
    expect(mocks.registerPushDevice).not.toHaveBeenCalled();
  });

  it('같은 정보는 다시 보내지 않고, 권한 상태나 토큰이 바뀌면 다시 등록한다', async () => {
    const { syncPushDevice } = await load();
    await syncPushDevice();

    expect(await syncPushDevice()).toBe('skipped');
    expect(mocks.registerPushDevice).toHaveBeenCalledTimes(1);

    mocks.getPushDeviceRegistration.mockResolvedValue({
      ...registration,
      authorizationStatus: 'DENIED',
    });
    expect(await syncPushDevice()).toBe('synced');

    mocks.getPushDeviceRegistration.mockResolvedValue({
      ...registration,
      authorizationStatus: 'DENIED',
      deviceToken: 'ffeeddcc',
    });
    expect(await syncPushDevice()).toBe('synced');
    expect(mocks.registerPushDevice).toHaveBeenCalledTimes(3);
  });

  it('등록에 실패하면 던지지 않고 실패로 알리며, 다음에 같은 값으로 다시 시도한다', async () => {
    const { syncPushDevice } = await load();
    mocks.registerPushDevice.mockRejectedValueOnce(new Error('network'));

    expect(await syncPushDevice()).toBe('failed');
    expect(await syncPushDevice()).toBe('synced');
    expect(mocks.registerPushDevice).toHaveBeenCalledTimes(2);
  });

  it('쉘에서 정보를 읽다 실패해도 던지지 않는다', async () => {
    const { syncPushDevice } = await load();
    mocks.getPushDeviceRegistration.mockRejectedValue(new Error('timeout'));

    expect(await syncPushDevice()).toBe('failed');
    expect(mocks.registerPushDevice).not.toHaveBeenCalled();
  });

  it('겹쳐 부르면 한 번만 읽고 등록한다', async () => {
    const { syncPushDevice } = await load();

    const results = await Promise.all([syncPushDevice(), syncPushDevice(), syncPushDevice()]);

    expect(results).toEqual(['synced', 'synced', 'synced']);
    expect(mocks.getPushDeviceRegistration).toHaveBeenCalledTimes(1);
    expect(mocks.registerPushDevice).toHaveBeenCalledTimes(1);
  });
});

describe('releasePushDevice', () => {
  it('쉘이 아니면 아무것도 하지 않는다', async () => {
    const { releasePushDevice } = await load();
    mocks.isNativeShell.mockReturnValue(false);

    await releasePushDevice();

    expect(mocks.getPushInstallationId).not.toHaveBeenCalled();
    expect(mocks.unregisterPushDevice).not.toHaveBeenCalled();
  });

  it('저장된 설치 ID로 서버에서 이 기기를 해제한다', async () => {
    const { releasePushDevice } = await load();

    await releasePushDevice();

    expect(mocks.unregisterPushDevice).toHaveBeenCalledWith(UUID);
  });

  it('등록한 적이 없으면(설치 ID 없음) 해제 요청을 보내지 않는다', async () => {
    const { releasePushDevice } = await load();
    mocks.getPushInstallationId.mockResolvedValue(null);

    await releasePushDevice();

    expect(mocks.unregisterPushDevice).not.toHaveBeenCalled();
  });

  it('쉘이 해제 정보를 모르는 오래된 쉘이면 건너뛴다', async () => {
    const { releasePushDevice } = await load();
    mocks.isNativeMethodAvailable.mockReturnValue(false);

    await releasePushDevice();

    expect(mocks.getPushInstallationId).not.toHaveBeenCalled();
  });

  it('쉘 오류나 해제 실패는 던지지 않아 로그아웃을 막지 않는다', async () => {
    const { releasePushDevice } = await load();

    mocks.getPushInstallationId.mockRejectedValueOnce(new Error('bridge down'));
    await expect(releasePushDevice()).resolves.toBeUndefined();

    mocks.unregisterPushDevice.mockRejectedValueOnce(new Error('401'));
    await expect(releasePushDevice()).resolves.toBeUndefined();
  });

  it('해제가 오래 걸려도 3초 뒤에는 끝나 로그아웃이 이어진다', async () => {
    vi.useFakeTimers();
    const { releasePushDevice } = await load();
    mocks.unregisterPushDevice.mockReturnValue(new Promise<void>(() => {}));

    let finished = false;
    void releasePushDevice().then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(finished).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(finished).toBe(true);
  });

  it('해제하면 마지막 등록 기록을 지워, 다시 로그인했을 때 같은 값도 새로 등록한다', async () => {
    const { syncPushDevice, releasePushDevice } = await load();
    await syncPushDevice();
    expect(await syncPushDevice()).toBe('skipped');

    await releasePushDevice();

    expect(await syncPushDevice()).toBe('synced');
    expect(mocks.registerPushDevice).toHaveBeenCalledTimes(2);
  });
});
