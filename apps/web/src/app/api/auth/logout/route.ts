import { NextResponse, type NextRequest } from 'next/server';
import { authCookieNames, clearAuthCookies } from '@/shared/api/server/authCookies';
import { reissueOnce, requestLogout } from '@/shared/api/server/authSession';

// access 쿠키가 만료돼 없으면 refresh로 재발급한 access 사용(백엔드 로그아웃은 access만 받음)
const accessTokenForLogout = async (request: NextRequest) => {
  const names = authCookieNames(request);
  const accessToken = request.cookies.get(names.access)?.value;
  if (accessToken) return accessToken;

  const refreshToken = request.cookies.get(names.refresh)?.value;
  if (!refreshToken) return undefined;
  return (await reissueOnce(refreshToken).catch(() => undefined))?.accessToken;
};

/** 로그아웃: 백엔드 세션 폐기를 시도하고, 결과(만료로 인한 401 포함)와 관계없이 쿠키 삭제 */
export async function POST(request: NextRequest) {
  const accessToken = await accessTokenForLogout(request);
  if (accessToken) await requestLogout(accessToken).catch(() => undefined);

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response, request);
  return response;
}
