import { useRef } from 'react';
import { isDefiniteRejection } from '@/shared/api/client/errorStatus';
import { createIdempotencyKey } from '@/shared/api/client/idempotencyKey';

/**
 * 같은 요청을 다시 보낼 때 같은 멱등 키를 씀(응답을 못 받고 다시 눌러도 서버가 같은 요청으로 알아봄, 화면이 떠 있는 동안만)
 * `signature`는 서버가 같은 요청으로 볼 입력 전부. 성공하거나 서버가 확정 거절하면 키를 버려 다음은 새 요청
 * 응답 없음·5xx·408·429는 이미 처리됐을 수 있어 키를 유지
 */
export function useIdempotencyKeys() {
  const keys = useRef(new Map<string, string>());
  return {
    keyFor: (signature: string) => {
      const known = keys.current.get(signature);
      if (known) return known;
      const key = createIdempotencyKey();
      keys.current.set(signature, key);
      return key;
    },
    settle: (signature: string, error?: unknown) => {
      if (error === undefined || isDefiniteRejection(error)) keys.current.delete(signature);
    },
  };
}
