import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_TOKEN_COOKIE, setAuthCookies } from '@/shared/api/authCookies';
import { reissueOnce } from '@/shared/api/authSession';
import { crossSiteResponse, isCrossSiteMutation } from '@/shared/api/crossSite';
import { toErrorResponse } from '@/shared/api/routeError';

/**
 * refresh 쿠키로 토큰 재발급
 * 실패해도 쿠키는 유지(다른 탭·인스턴스가 먼저 교체한 새 쿠키를 지우지 않도록), 정리는 로그아웃이 담당
 */
export async function POST(request: NextRequest) {
  if (isCrossSiteMutation(request)) return crossSiteResponse();

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'BFF_UNAUTHENTICATED' },
      { status: 401 },
    );
  }

  try {
    const tokens = await reissueOnce(refreshToken);
    const response = new NextResponse(null, { status: 204 });
    setAuthCookies(response, request, tokens);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
