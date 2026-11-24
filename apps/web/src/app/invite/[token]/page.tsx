import type { Metadata, Viewport } from 'next';
import { InviteEntry } from '@/features/invite-entry/components';
import { APP_STORE_APP_ID, INVITE_LINK_ORIGIN } from '@/features/invite-entry/constants/messages';
import { isInviteToken } from '@/features/invite-entry/lib/token';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { readInvitationBunchName } from '@/shared/api/server/invitationPreview';
import { SITE_NAME } from '@/shared/constants/site';

const DEFAULT_TITLE = `${SITE_NAME} 초대장`;
// 미리보기 카드 제목 아래 한 줄. 기획 원문이 없는 임시 문구
const DESCRIPTION = '초대장을 열고 함께한 순간을 기록해 보세요.';
// Figma 「오픈그래프 이미지」(6468:114571), 1.5배 내보내기
const OG_IMAGE = {
  url: '/images/og/invite.png',
  width: 1800,
  height: 945,
  alt: '초대장이 도착했어요',
};

type InvitePageProps = { params: Promise<{ token: string }> };

/**
 * 링크 미리보기(기능명세 2.4.3·2.7.1): 「{번치 이름}에 초대받았어요」, 이름을 못 읽으면 기본 제목
 * 초대 링크마다 다른 공개 주소라 검색에 노출하지 않고, 토큰이 든 주소라 og:url을 넣지 않으며 Referer를 보내지 않음
 * 이미지 절대 주소는 Next 기본값(Vercel 운영 도메인 `VERCEL_PROJECT_PRODUCTION_URL`)을 따름(docs/workflows/seo.md)
 */
export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { token } = await params;
  const bunchName = await readInvitationBunchName(token);
  const title = bunchName ? `${bunchName}에 초대받았어요` : DEFAULT_TITLE;

  return {
    title: DEFAULT_TITLE,
    description: DESCRIPTION,
    robots: { index: false },
    referrer: 'no-referrer',
    // iPhone·iPad Safari 위쪽의 앱 배너(Smart App Banner, Safari가 그리고 설치 여부에 따라 「열기」·「보기」). 인앱 브라우저·앱 WebView에는 뜨지 않음
    // 「열기」는 이 초대 링크를 앱에 넘겨 유니버셜 링크와 같은 흐름으로 염. 형식이 아닌 토큰은 넘기지 않음(앱은 안내 없이 화면을 유지하므로 웹에서 무효 안내)
    itunes: isInviteToken(token)
      ? { appId: APP_STORE_APP_ID, appArgument: `${INVITE_LINK_ORIGIN}/invite/${token}` }
      : { appId: APP_STORE_APP_ID },
    openGraph: { type: 'website', title, description: DESCRIPTION, images: [OG_IMAGE] },
    twitter: {
      card: 'summary_large_image',
      title,
      description: DESCRIPTION,
      images: [OG_IMAGE.url],
    },
  };
}

// 어두운 사진이 화면 끝까지 차므로 상태바 영역도 어둡게(전역 기본은 흰색)
export const viewport: Viewport = { themeColor: '#000000' };

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <InviteEntry token={token} continueHref={ONBOARDING_PATHS.joinBunchEnter} />;
}
