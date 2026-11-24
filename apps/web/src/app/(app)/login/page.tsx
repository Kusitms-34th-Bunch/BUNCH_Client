import type { Metadata } from 'next';
import { DevTokenLogin, LoginEntry } from '@/features/auth/components';
import { LOGIN_PATH } from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { isDevTokenLoginEnabled } from '@/shared/api/server/devTokenFlag';
import {
  APP_STORE_APP_ID,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_ORIGIN,
  SITE_SLOGAN,
} from '@/shared/constants/site';

// 서비스 첫 화면이라 유일한 색인 대상(robots·sitemap). 이미지 절대 주소는 Next 기본값(docs/workflows/seo.md)
const TITLE = `${SITE_NAME} - ${SITE_SLOGAN}`;
const PAGE_URL = `${SITE_ORIGIN}${LOGIN_PATH}`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: SITE_SLOGAN,
  alternates: { canonical: PAGE_URL },
  // iPhone·iPad Safari로 열었을 때 위쪽 앱 배너(앱 WebView·인앱 브라우저에는 안 뜸)
  itunes: { appId: APP_STORE_APP_ID },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PAGE_URL,
    locale: 'ko_KR',
    title: TITLE,
    description: SITE_SLOGAN,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: SITE_SLOGAN,
    images: [SITE_OG_IMAGE.url],
  },
};

// 가입을 마친 사용자의 도착 화면은 다른 feature 소유라 route에서 조합해 넘김
const DESTINATIONS = {
  bunchHome: BUNCH_HOME_PATHS.home,
  bunchStart: ONBOARDING_PATHS.start,
  inviteEntry: ONBOARDING_PATHS.joinBunchEnter,
};

export default function LoginPage() {
  return (
    // iOS 쉘이 배경 영상을 맡으면(로그인 화면이 transparent 표식) 흰 바탕을 비워 WebView 뒤 네이티브 영상이 비치게 함
    <div
      data-ssgoi-transition={LOGIN_PATH}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col has-data-[app-background=transparent]:bg-transparent"
    >
      <LoginEntry destinations={DESTINATIONS} />
      {/* 개발 전용 토큰 로그인: 서버가 요청 시점에 판단하는 진입점(운영 빌드 제외, 변수가 클라이언트 번들에 들어가지 않음) */}
      {isDevTokenLoginEnabled() ? <DevTokenLogin destinations={DESTINATIONS} /> : null}
    </div>
  );
}
