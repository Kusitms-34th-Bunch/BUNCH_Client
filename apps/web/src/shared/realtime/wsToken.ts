import { normalizeError, parseOrThrow } from '@app/api-core';
import { z } from 'zod';
import { bffApi } from '../api/bffApi';

const wsTokenSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string().min(1),
});

export type WsToken = z.infer<typeof wsTokenSchema>;

/**
 * 실시간 연결 직전에 BFF에서 연결용 토큰을 받음(access 토큰은 httpOnly 쿠키라 브라우저가 직접 읽을 수 없음)
 * 일회용이 아니라 만료 시각 안에 연결하면 세션이 유지되므로 연결(재연결)마다 새로 받고 저장하지 않음
 */
export const fetchWsToken = async (): Promise<WsToken> => {
  try {
    return parseOrThrow(wsTokenSchema, await bffApi.post('auth/ws-token').json(), 'ws token');
  } catch (error) {
    throw normalizeError(error);
  }
};
