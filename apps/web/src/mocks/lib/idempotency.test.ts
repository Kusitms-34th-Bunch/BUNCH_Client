import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetIdempotency, runIdempotent } from './idempotency';

afterEach(() => {
  resetIdempotency();
});

const created = { status: 200, body: { id: 7 } };

describe('runIdempotent', () => {
  it('처음 보는 키는 실행하고 결과를 돌려준다', () => {
    const execute = vi.fn(() => created);
    expect(runIdempotent('1:42:CREATE', 'key-a', '{"photoIds":[101]}', execute)).toEqual({
      kind: 'executed',
      response: created,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('같은 키와 같은 본문으로 다시 보내면 실행하지 않고 처음 결과를 다시 준다', () => {
    runIdempotent('1:42:CREATE', 'key-a', '{"photoIds":[101]}', () => created);
    const execute = vi.fn(() => ({ status: 200, body: { id: 8 } }));
    expect(runIdempotent('1:42:CREATE', 'key-a', '{"photoIds":[101]}', execute)).toEqual({
      kind: 'replayed',
      response: created,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('같은 키에 다른 본문이면 충돌이다', () => {
    runIdempotent('1:42:CREATE', 'key-a', '{"photoIds":[101]}', () => created);
    const execute = vi.fn(() => created);
    expect(runIdempotent('1:42:CREATE', 'key-a', '{"photoIds":[102]}', execute)).toEqual({
      kind: 'conflict',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('다른 범위의 같은 키는 별개로 처리한다', () => {
    runIdempotent('1:42:CREATE', 'key-a', 'x', () => created);
    expect(runIdempotent('1:43:CREATE', 'key-a', 'y', () => created).kind).toBe('executed');
  });

  it('초기화하면 같은 키도 새로 실행한다', () => {
    runIdempotent('1:42:CREATE', 'key-a', 'x', () => created);
    resetIdempotency();
    expect(runIdempotent('1:42:CREATE', 'key-a', 'y', () => created).kind).toBe('executed');
  });
});
