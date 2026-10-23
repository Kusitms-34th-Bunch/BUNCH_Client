import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, clearAuthCookies } from '@/shared/api/authCookies';
import { requestLogout } from '@/shared/api/authSession';
import { crossSiteResponse, isCrossSiteMutation } from '@/shared/api/crossSite';

/** 로그아웃: 백엔드 세션 폐기를 시도하고, 결과(만료로 인한 401 포함)와 관계없이 쿠키 삭제 */
export async function POST(request: NextRequest) {
  if (isCrossSiteMutation(request)) return crossSiteResponse();

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) await requestLogout(accessToken).catch(() => undefined);

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response, request);
  return response;
}
