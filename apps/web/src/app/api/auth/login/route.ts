import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { setAuthCookies } from '@/shared/api/authCookies';
import { requestLogin } from '@/shared/api/authSession';
import { parseRequestBody } from '@/shared/api/requestBody';
import { toErrorResponse } from '@/shared/api/routeError';

const loginBodySchema = z
  .object({
    provider: z.enum(['apple', 'google', 'kakao']),
    idToken: z.string().min(1),
    nonce: z.string().min(1).optional(),
  })
  .refine((body) => body.provider === 'google' || body.nonce !== undefined, {
    message: 'Apple·Kakao 로그인에는 nonce가 필요합니다.',
  });

/** 소셜 로그인: 백엔드가 준 토큰을 httpOnly 쿠키로 저장하고 본문 없이 204 */
export async function POST(request: NextRequest) {
  try {
    const parsed = loginBodySchema.safeParse(await parseRequestBody(request));
    if (!parsed.success) {
      return NextResponse.json(
        { message: '로그인 요청 형식이 올바르지 않습니다.', code: 'BFF_INVALID_REQUEST' },
        { status: 400 },
      );
    }

    const tokens = await requestLogin(parsed.data);
    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, request, tokens);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
