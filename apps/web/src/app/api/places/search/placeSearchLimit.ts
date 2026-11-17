import 'server-only';
import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createRateLimiter } from '@/shared/api/server/rateLimit';

// 호출 제한(서버 인스턴스마다 세는 최선 노력 제한, 한도 값은 정해진 기획이 없어 임시로 둔 값)
// 사용자(로그인 토큰)별은 입력할 때마다 나가는 정상 검색보다 넉넉하게, 같은 공유기·회사망의 여러 사용자가 한 IP로 보일 수 있어 IP별은 더 넉넉하게 둠
const RATE_WINDOW_MS = 60 * 1000;
export const TOKEN_LIMIT_PER_WINDOW = 100;
export const IP_LIMIT_PER_WINDOW = 500;
const RATE_MAX_KEYS = 10_000;

const tokenLimiter = createRateLimiter({
  limit: TOKEN_LIMIT_PER_WINDOW,
  windowMs: RATE_WINDOW_MS,
  maxKeys: RATE_MAX_KEYS,
});
const ipLimiter = createRateLimiter({
  limit: IP_LIMIT_PER_WINDOW,
  windowMs: RATE_WINDOW_MS,
  maxKeys: RATE_MAX_KEYS,
});

/** 테스트에서 요청 사이에 호출 횟수가 새지 않도록 비움 */
export const clearPlaceSearchRateLimit = () => {
  tokenLimiter.clear();
  ipLimiter.clear();
};

// 토큰 값은 보관하지 않고 해시 앞부분만 키로 씀(위조한 쿠키를 바꿔 가며 보내도 IP 제한이 막음)
const tokenKey = (accessToken: string) =>
  createHash('sha256').update(accessToken).digest('hex').slice(0, 16);

// IP 모양(IPv4·IPv6)이 아닌 값이나 지나치게 긴 값은 키로 쓰지 않음(헤더를 임의 문자열로 채워 키 메모리를 늘리는 것 방지)
const IP_SHAPE = /^[0-9a-fA-F:.]{2,45}$/;

// 프록시가 붙인 클라이언트 IP(앞의 값이 원래 요청자, 운영 배포(Vercel)는 이 헤더를 덮어써 클라이언트가 보낸 값을 믿지 않음)
// 없거나 IP 모양이 아니면 한 묶음으로 셈
const clientIp = (request: NextRequest) => {
  const first = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  return IP_SHAPE.test(first) ? first : 'unknown';
};

/** 이 요청을 셈. 허용하면 undefined, 한도를 넘었으면 다시 시도할 수 있을 때까지 남은 초 */
export const checkPlaceSearchRate = (
  request: NextRequest,
  accessToken: string,
): number | undefined =>
  tokenLimiter.check(`token:${tokenKey(accessToken)}`) ??
  ipLimiter.check(`ip:${clientIp(request)}`);
