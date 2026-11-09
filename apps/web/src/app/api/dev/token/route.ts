import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { setAccessTokenCookie } from '@/shared/api/authCookies';
import { requestDevToken } from '@/shared/api/devToken';
import { isDevTokenLoginEnabled } from '@/shared/api/devTokenFlag';
import { parseRequestBody } from '@/shared/api/requestBody';
import { toErrorResponse } from '@/shared/api/routeError';

const bodySchema = z.object({ nickname: z.string().trim().min(1).max(30) });

/** 개발 전용 로그인: 켜져 있지 않으면 없는 route처럼 404, 닉네임으로 받은 access 토큰은 httpOnly 쿠키로 저장하고 본문 없이 204 */
export async function POST(request: NextRequest) {
  if (!isDevTokenLoginEnabled()) return new NextResponse(null, { status: 404 });

  try {
    const parsed = bodySchema.safeParse(await parseRequestBody(request));
    if (!parsed.success) {
      return NextResponse.json(
        { message: '닉네임을 확인해 주세요.', code: 'BFF_INVALID_REQUEST' },
        { status: 400 },
      );
    }

    const { accessToken } = await requestDevToken(parsed.data.nickname);
    const response = new NextResponse(null, { status: 204 });
    setAccessTokenCookie(response, request, accessToken);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
