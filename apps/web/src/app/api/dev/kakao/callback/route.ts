import { type NextRequest } from 'next/server';
import { setAuthCookies } from '@/shared/api/authCookies';
import { requestLogin } from '@/shared/api/authSession';
import {
  afterLoginRedirect,
  backendErrorCode,
  callbackUrl,
  clearFlowCookies,
  DevLoginError,
  exchangeCodeForIdToken,
  isDevWebLoginEnabled,
  loginErrorRedirect,
  notFoundResponse,
  readFlowCookies,
} from '../devLogin';

/**
 * 개발 전용 카카오 웹 로그인 콜백(삭제 예정): state를 확인하고 인가 코드를 ID 토큰으로 교환해 기존 로그인 경로와 같이 세션 쿠키를 발급
 * 실패하면 로그인 화면으로 돌려보내고 오류 코드만 쿼리로 전달(토큰·본문은 전달하지 않음)
 */
export async function GET(request: NextRequest) {
  if (!isDevWebLoginEnabled()) return notFoundResponse();

  const { searchParams } = request.nextUrl;
  const kakaoError = searchParams.get('error');
  if (kakaoError) {
    return loginErrorRedirect(
      request,
      kakaoError === 'access_denied' ? 'access_denied' : 'kakao_error',
    );
  }

  const code = searchParams.get('code');
  const { state, nonce } = readFlowCookies(request);
  // state가 요청 때 쿠키에 둔 값과 같아야 함(CSRF 방지)
  if (!code || !state || !nonce || searchParams.get('state') !== state) {
    return loginErrorRedirect(request, 'invalid_state');
  }

  let idToken: string;
  try {
    idToken = await exchangeCodeForIdToken({ code, redirectUri: callbackUrl(request) });
  } catch (error) {
    return loginErrorRedirect(
      request,
      error instanceof DevLoginError ? error.code : 'token_exchange_failed',
    );
  }

  try {
    const tokens = await requestLogin({ provider: 'kakao', idToken, nonce });
    const response = afterLoginRedirect(request);
    setAuthCookies(response, request, tokens);
    clearFlowCookies(response, request);
    return response;
  } catch (error) {
    return loginErrorRedirect(request, backendErrorCode(error));
  }
}
