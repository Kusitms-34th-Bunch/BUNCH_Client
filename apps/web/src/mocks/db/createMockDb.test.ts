import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorageAdapter } from './storage';
import { createMockDb } from './createMockDb';

type State = { count: number };

const fakeStorage = (initial?: State) => {
  const saved = new Map<string, unknown>(initial ? [['key', initial]] : []);
  const adapter: StorageAdapter = {
    read: vi.fn((key: string) => Promise.resolve(saved.get(key))),
    write: vi.fn((key: string, value: unknown) => {
      saved.set(key, value);
      return Promise.resolve();
    }),
  };
  return { adapter, saved };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('createMockDb', () => {
  it('처음 읽을 때 시작값으로 만들고 이후에는 같은 값을 돌려준다', () => {
    const seed = vi.fn(() => ({ count: 0 }));
    const db = createMockDb<State>({ key: 'key', seed, storage: undefined });
    expect(db.get()).toEqual({ count: 0 });
    expect(db.get()).toBe(db.get());
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it('update는 새 값으로 바꾸고 reset은 시작값으로 되돌린다', () => {
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: undefined });
    db.update((current) => ({ count: current.count + 1 }));
    expect(db.get()).toEqual({ count: 1 });
    db.reset();
    expect(db.get()).toEqual({ count: 0 });
  });

  it('hydrate 전에는 저장하지 않는다', async () => {
    vi.useFakeTimers();
    const { adapter } = fakeStorage();
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: adapter });
    db.update(() => ({ count: 5 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(adapter.write).not.toHaveBeenCalled();
  });

  it('hydrate하면 저장된 상태로 이어서 시작한다', async () => {
    const { adapter } = fakeStorage({ count: 7 });
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: adapter });
    await db.hydrate();
    expect(db.get()).toEqual({ count: 7 });
  });

  it('저장된 값이 없으면 시작값으로 시작한다', async () => {
    const { adapter } = fakeStorage();
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: adapter });
    await db.hydrate();
    expect(db.get()).toEqual({ count: 0 });
  });

  it('hydrate한 뒤 바뀐 상태는 조용해지면 한 번만 저장한다', async () => {
    vi.useFakeTimers();
    const { adapter, saved } = fakeStorage();
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: adapter });
    await db.hydrate();

    db.update(() => ({ count: 1 }));
    db.update(() => ({ count: 2 }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(adapter.write).toHaveBeenCalledTimes(1);
    expect(saved.get('key')).toEqual({ count: 2 });
  });

  it('reset하면 저장된 값도 시작값이 된다', async () => {
    vi.useFakeTimers();
    const { adapter, saved } = fakeStorage({ count: 9 });
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: adapter });
    await db.hydrate();
    db.reset();
    await vi.advanceTimersByTimeAsync(1000);
    expect(saved.get('key')).toEqual({ count: 0 });
  });

  it('저장소를 읽거나 쓰지 못해도 던지지 않고 메모리로 이어간다', async () => {
    vi.useFakeTimers();
    const adapter: StorageAdapter = {
      read: () => Promise.reject(new Error('read failed')),
      write: () => Promise.reject(new Error('write failed')),
    };
    const db = createMockDb<State>({ key: 'key', seed: () => ({ count: 0 }), storage: adapter });
    await expect(db.hydrate()).resolves.toBeUndefined();
    db.update(() => ({ count: 3 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(db.get()).toEqual({ count: 3 });
  });
});
