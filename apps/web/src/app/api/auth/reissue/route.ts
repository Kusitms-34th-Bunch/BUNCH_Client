import { NextResponse, type NextRequest } from 'next/server';
import { authCookieNames, setAuthCookies } from '@/shared/api/server/authCookies';
import { reissueOnce } from '@/shared/api/server/authSession';
import { toErrorResponse } from '@/shared/api/server/routeError';
import { NO_SESSION_CODE } from '@/shared/api/sessionCodes';

/**
 * refresh 쿠키로 토큰 재발급
 * 실패해도 쿠키는 유지(다른 탭·인스턴스가 먼저 교체한 새 쿠키를 지우지 않도록), 정리는 로그아웃이 담당
 */
export async function POST(request: NextRequest) {
  const names = authCookieNames(request);
  const refreshToken = request.cookies.get(names.refresh)?.value;
  if (!refreshToken) {
    // 두 쿠키가 모두 없으면 다른 탭이 갱신했을 가능성도 없어 브라우저가 세션 확인을 건너뜀(비로그인 첫 진입 요청 1번 줄임)
    const noSession = !request.cookies.get(names.access)?.value;
    return NextResponse.json(
      {
        message: '로그인이 필요합니다.',
        code: noSession ? NO_SESSION_CODE : 'BFF_UNAUTHENTICATED',
      },
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
