import type { Metadata, Viewport } from 'next';
import { InviteEntry } from '@/features/invite-entry/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

// 초대 링크마다 다른 공개 주소라 검색에 노출하지 않음(링크 미리보기 OG는 후속)
// 주소에 초대 토큰이 있어 이 페이지에서 나가는 요청에 Referer를 보내지 않음(외부 링크·이미지를 붙일 때도 유지)
export const metadata: Metadata = {
  title: 'bunch 초대장',
  robots: { index: false },
  referrer: 'no-referrer',
};

// 어두운 사진이 화면 끝까지 차므로 상태바 영역도 어둡게(전역 기본은 흰색)
export const viewport: Viewport = { themeColor: '#000000' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteEntry token={token} continueHref={ONBOARDING_PATHS.joinBunchEnter} />;
}
