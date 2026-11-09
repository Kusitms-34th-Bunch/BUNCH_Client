import 'server-only';
import { unwrapEnvelope } from '@app/api-core';
import { z } from 'zod';
import { createServerApi } from './serverClient';

const devTokenSchema = z.object({ accessToken: z.string().min(1) });

/**
 * 개발·스테이징 전용 토큰 발급(`POST /api/v1/auth/dev/token`): 닉네임으로 계정을 정해 access 토큰만 받음(refresh 토큰 없음)
 * 소셜 로그인 없이 가입 이후 API까지 실서버로 확인하는 용도라 route에서 환경 변수로 막고 호출함
 */
export const requestDevToken = async (nickname: string) =>
  devTokenSchema.parse(
    unwrapEnvelope(
      await createServerApi().post('api/v1/auth/dev/token', { json: { nickname } }).json(),
    ),
  );
