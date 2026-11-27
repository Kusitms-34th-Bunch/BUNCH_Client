import { appVersionSchema } from '@app/bridge';
import { type NextRequest, NextResponse } from 'next/server';
import { isUpdateRequired } from '@/features/app-update/lib/appVersionPolicy';

/**
 * 앱 업데이트 필요 여부: `?version=1.2.0&build=3`, 이전 쉘은 `?version=legacy`
 * 로그인 전 화면에서도 묻고 응답에 개인 정보가 없어 인증 없이 받음. 정책을 바꾸면 1분 안에 퍼지게 캐시 60초
 */
export const GET = (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const version = params.get('version');
  const app =
    version === 'legacy'
      ? 'legacy'
      : appVersionSchema.safeParse({ version, build: params.get('build') }).data;
  if (!app) {
    return NextResponse.json(
      { message: '앱 버전 형식이 올바르지 않습니다.', code: 'BFF_INVALID_APP_VERSION' },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { updateRequired: isUpdateRequired(app) },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
};
