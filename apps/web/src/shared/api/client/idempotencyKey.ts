/** 같은 요청의 재전송이 한 번만 처리되게 하는 요청 헤더 */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

const toHex = (byte: number) => byte.toString(16).padStart(2, '0');

/** 요청마다 새 UUID v4 생성, randomUUID가 없는 http IP 접속은 getRandomValues로 대체 */
export const createIdempotencyKey = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map(toHex).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
