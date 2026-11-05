import { NextResponse, type NextRequest } from 'next/server';
import { crossSiteResponse, isCrossSiteMutation } from '@/shared/api/crossSite';

/** 모든 BFF 요청(`/api/*`)의 CSRF 검사를 한 곳에서 처리(docs/architecture/api-boundary.md) */
export function proxy(request: NextRequest) {
  if (isCrossSiteMutation(request)) return crossSiteResponse();
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
