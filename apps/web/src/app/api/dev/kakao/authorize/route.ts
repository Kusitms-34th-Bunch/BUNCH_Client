import { NextResponse, type NextRequest } from 'next/server';
import {
  buildAuthorizeUrl,
  callbackUrl,
  isDevWebLoginEnabled,
  notFoundResponse,
  randomToken,
  readRestApiKey,
  setFlowCookies,
} from '../devLogin';

/** 개발 전용 카카오 웹 로그인 시작(삭제 예정): state·nonce를 만들어 쿠키에 두고 카카오 인가 화면으로 보냄 */
export function GET(request: NextRequest) {
  if (!isDevWebLoginEnabled()) return notFoundResponse();

  const clientId = readRestApiKey();
  if (!clientId) {
    return NextResponse.json(
      { message: 'KAKAO_REST_API_KEY 환경변수가 필요합니다.', code: 'DEV_LOGIN_NOT_CONFIGURED' },
      { status: 500 },
    );
  }

  const state = randomToken();
  const nonce = randomToken();
  const response = NextResponse.redirect(
    buildAuthorizeUrl({ clientId, redirectUri: callbackUrl(request), state, nonce }),
  );
  setFlowCookies(response, request, { state, nonce });
  return response;
}
