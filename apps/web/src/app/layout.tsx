import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ApiMockingGate } from '@/mocks/ApiMockingGate';
import './globals.css';
import { NativeShellViewport } from '@/shared/components/layout/NativeShellViewport';
import { WebVitalsReporter } from '@/shared/components/layout/WebVitalsReporter';
import { SITE_NAME, SITE_OG_IMAGE, SITE_SLOGAN } from '@/shared/constants/site';

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_SLOGAN,
  // 따로 정하지 않은 화면의 링크 미리보기 기본값(로그인·초대장은 각자 덮어씀)
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'ko_KR', images: [SITE_OG_IMAGE] },
  twitter: { card: 'summary_large_image', images: [SITE_OG_IMAGE.url] },
  // 홈 화면에 추가하면 주소창 없이 실행(iOS), 홈 화면 이름은 서비스 이름, 아이콘은 앱 아이콘과 같은 그림(public/icons)
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  // 브라우저 탭 아이콘. /favicon.ico는 app/favicon.ico 파일로 따로 붙음
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  // 검색 등록 확인 태그(값은 운영 배포 환경 변수, 없으면 넣지 않음)
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
    ...(process.env.NAVER_SITE_VERIFICATION && {
      other: { 'naver-site-verification': process.env.NAVER_SITE_VERIFICATION },
    }),
  },
  // 가짜 서버를 켠 UT 빌드는 검색에 노출하지 않음
  ...(process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' && {
    robots: { index: false, follow: false },
  }),
};

// iOS에서 env(safe-area-inset-*)가 값을 돌려주려면 viewport-fit=cover 필요
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 네이티브 쉘이 hydration 전에 html.style에 기기별 Safe Area를 주입함
    <html lang="ko" suppressHydrationWarning>
      <body>
        <NativeShellViewport />
        <WebVitalsReporter />
        <ApiMockingGate>{children}</ApiMockingGate>
      </body>
    </html>
  );
}
