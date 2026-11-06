import { describe, expect, it, vi } from 'vitest';

const { start, setupWorker } = vi.hoisted(() => {
  const startMock = vi.fn(() => Promise.resolve(undefined));
  return { start: startMock, setupWorker: vi.fn(() => ({ start: startMock })) };
});
vi.mock('msw/browser', () => ({ setupWorker }));

describe('startApiMocking', () => {
  it('여러 번 불러도(StrictMode의 effect 이중 실행) 서비스 워커는 한 번만 시작한다', async () => {
    const { startApiMocking } = await import('./browser');

    await Promise.all([startApiMocking(), startApiMocking()]);
    await startApiMocking();

    expect(setupWorker).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ onUnhandledFrame: 'bypass' }));
  });
});
