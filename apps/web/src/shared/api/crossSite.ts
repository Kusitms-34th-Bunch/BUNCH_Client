import { NextResponse, type NextRequest } from 'next/server';

/**
 * 다른 사이트(형제 서브도메인 포함)에서 온 상태 변경 요청 여부
 * 쿠키 인증 BFF의 CSRF 방어(백엔드는 CSRF·Origin 검사 없음). `Sec-Fetch-Site`가 없는 오래된 클라이언트는 SameSite=Lax로 cross-site만 방어(same-site 미방어)
 */
export const isCrossSiteMutation = (request: NextRequest) => {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  const site = request.headers.get('sec-fetch-site');
  return site === 'cross-site' || site === 'same-site';
};

export const crossSiteResponse = () =>
  NextResponse.json(
    { message: '허용되지 않는 요청입니다.', code: 'BFF_CROSS_SITE' },
    { status: 403 },
  );
