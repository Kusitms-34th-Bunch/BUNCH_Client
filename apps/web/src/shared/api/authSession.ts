import 'server-only';
import { unwrapEnvelope } from '@app/api-core';
import { z } from 'zod';
import type { TokenPair } from './authCookies';
import { createServerApi } from './serverClient';

export type SocialProvider = 'apple' | 'google' | 'kakao';

const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

const readTokenPair = async (response: Promise<unknown>): Promise<TokenPair> =>
  tokenPairSchema.parse(unwrapEnvelope(await response));

/** 소셜 ID 토큰으로 백엔드 로그인. Apple·Kakao는 nonce 필수, Google은 미사용 */
export const requestLogin = (input: {
  provider: SocialProvider;
  idToken: string;
  nonce?: string | undefined;
}) =>
  readTokenPair(
    createServerApi()
      .post(`api/v1/auth/${input.provider}/login`, {
        json:
          input.provider === 'google'
            ? { idToken: input.idToken }
            : { idToken: input.idToken, nonce: input.nonce },
      })
      .json(),
  );

/** refresh 토큰으로 토큰 쌍 재발급(백엔드가 refresh 토큰을 교체해 이전 토큰은 무효) */
export const requestReissue = (refreshToken: string) =>
  readTokenPair(createServerApi().post('api/v1/auth/reissue', { json: { refreshToken } }).json());

/** 현재 세션의 refresh 토큰 폐기 */
export const requestLogout = async (accessToken: string) => {
  await createServerApi({ accessToken }).post('api/v1/auth/logout');
};

const RECENT_REISSUE_MS = 10_000;
// ponytail: 프로세스 메모리 기준이라 웹 서버 인스턴스가 여러 개면 인스턴스 사이에는 공유 안 됨(그때 Redis 등 공용 저장소로 이동)
const reissues = new Map<string, Promise<TokenPair>>();

/**
 * 같은 refresh 토큰의 재발급은 한 번만 실행하고 결과 공유(탭 WebView 여러 개의 동시 401 대비)
 * 성공 결과는 10초 유지해 직후 도착한 이전 토큰 요청도 같은 토큰 쌍을 받음(그동안 이전 refresh 토큰으로도 새 토큰 획득 가능)
 */
export const reissueOnce = (
  refreshToken: string,
  reissue: typeof requestReissue = requestReissue,
): Promise<TokenPair> => {
  const pending = reissues.get(refreshToken);
  if (pending) return pending;

  const result = reissue(refreshToken);
  reissues.set(refreshToken, result);
  result.then(
    () => setTimeout(() => reissues.delete(refreshToken), RECENT_REISSUE_MS),
    () => reissues.delete(refreshToken),
  );
  return result;
};
