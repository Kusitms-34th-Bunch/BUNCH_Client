import 'server-only';
import { HTTPError } from 'ky';
import { createHash } from 'node:crypto';
import { createServerApi } from '@/shared/api/server/serverClient';

// 확인 결과를 다시 쓰는 시간. 입력할 때마다 백엔드를 부르지 않게(토큰이 만료·폐기돼도 이 시간 안에는 통과)
const VERIFIED_TTL_MS = 60 * 1000;
const VERIFY_TIMEOUT_MS = 3000;
const MAX_ENTRIES = 5000;

// 토큰 원문 대신 해시를 키로(서버 메모리에 토큰을 남기지 않음). 인스턴스마다 따로라 적중률은 배포 형태에 따라 다름
const verified = new Map<string, number>();

const keyOf = (accessToken: string) => createHash('sha256').update(accessToken).digest('hex');

/** 백엔드 확인이 401·403이 아닌 이유로 실패(일시 장애). 장소 검색은 막고 다시 시도하게 함 */
export class PlaceSearchAuthUnavailableError extends Error {}

/**
 * access 쿠키 값이 백엔드가 인정하는 로그인 토큰인지(`GET api/v1/members/me`)
 * 쿠키가 있는지만 보면 아무 값으로도 서버 키의 카카오 API를 부를 수 있음(#604). 성공만 짧게 기억하고 거절은 기억하지 않음
 */
export const isSignedIn = async (accessToken: string) => {
  const key = keyOf(accessToken);
  const until = verified.get(key);
  if (until !== undefined && until > Date.now()) return true;
  verified.delete(key);
  try {
    const api = await createServerApi({ accessToken, timeoutMs: VERIFY_TIMEOUT_MS });
    // 장애 중인 백엔드에 다시 보내지 않음(ky GET 기본 재시도 끔)
    await api.get('api/v1/members/me', { retry: 0 });
  } catch (error) {
    // 명세에 뜻이 없는 403 등은 로그인 여부로 해석하지 않고 일시 장애와 같이 막음
    if (error instanceof HTTPError && error.response.status === 401) return false;
    throw new PlaceSearchAuthUnavailableError('로그인 확인 실패', { cause: error });
  }
  // 오래된 것부터 지움(Map은 넣은 순서를 지킴)
  if (verified.size >= MAX_ENTRIES) verified.delete(verified.keys().next().value!);
  verified.set(key, Date.now() + VERIFIED_TTL_MS);
  return true;
};

/** 테스트용: 기억한 확인 결과를 비움 */
export const clearPlaceSearchAuth = () => verified.clear();
