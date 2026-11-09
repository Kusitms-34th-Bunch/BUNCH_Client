import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { setAccessTokenCookie } from '@/shared/api/authCookies';
import { requestDevToken } from '@/shared/api/devToken';
import { parseRequestBody } from '@/shared/api/requestBody';
import { toErrorResponse } from '@/shared/api/routeError';

const bodySchema = z.object({ nickname: z.string().trim().min(1).max(30) });

/** 서버 전용 `DEV_TOKEN_LOGIN=enabled`이고 운영 빌드가 아닐 때만 켜짐(둘 중 하나라도 어긋나면 route가 없는 것처럼 404) */
const isDevTokenLoginEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.DEV_TOKEN_LOGIN === 'enabled';

/** 개발 전용 로그인: 닉네임으로 받은 access 토큰을 httpOnly 쿠키로 저장하고 본문 없이 204 */
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
