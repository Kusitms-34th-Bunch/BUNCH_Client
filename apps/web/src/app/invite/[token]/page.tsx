import type { Metadata, Viewport } from 'next';
import { InviteEntry } from '@/features/invite-entry/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { readInvitationBunchName } from '@/shared/api/server/invitationPreview';

const DEFAULT_TITLE = 'bunch 초대장';
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
    robots: { index: false },
    referrer: 'no-referrer',
    openGraph: { type: 'website', title, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, images: [OG_IMAGE.url] },
  };
}

// 어두운 사진이 화면 끝까지 차므로 상태바 영역도 어둡게(전역 기본은 흰색)
export const viewport: Viewport = { themeColor: '#000000' };

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <InviteEntry token={token} continueHref={ONBOARDING_PATHS.joinBunchEnter} />;
}
