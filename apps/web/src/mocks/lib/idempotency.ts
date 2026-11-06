export type StoredResponse = { status: number; body: unknown };

export type IdempotencyOutcome =
  | { kind: 'executed'; response: StoredResponse }
  | { kind: 'replayed'; response: StoredResponse }
  | { kind: 'conflict' };

type Entry = { fingerprint: string; response: StoredResponse };

const entries = new Map<string, Entry>();

/**
 * `Idempotency-Key` 규칙 모사, 같은 범위·키·본문의 재요청은 처음 응답 재생(replayed)
 * 같은 키에 다른 본문은 conflict(백엔드 REQUEST_001, 409)
 * scope는 회원·번치·동작 단위, fingerprint는 요청 본문 식별값
 */
export const runIdempotent = (
  scope: string,
  key: string,
  fingerprint: string,
  execute: () => StoredResponse,
): IdempotencyOutcome => {
  const id = `${scope}:${key}`;
  const existing = entries.get(id);
  if (existing) {
    return existing.fingerprint === fingerprint
      ? { kind: 'replayed', response: existing.response }
      : { kind: 'conflict' };
  }
  const response = execute();
  entries.set(id, { fingerprint, response });
  return { kind: 'executed', response };
};

/** 저장한 키 전체 삭제(테스트 격리) */
export const resetIdempotency = () => entries.clear();
