import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ApiMockingGate } from '@/mocks/ApiMockingGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'bunch',
  // 홈 화면에 추가하면 주소창 없이 실행(iOS), 홈 화면 이름은 bunch, 아이콘은 임시 이미지(확정되면 public/icons 교체)
  appleWebApp: { capable: true, title: 'bunch', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
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
        <ApiMockingGate>{children}</ApiMockingGate>
      </body>
    </html>
  );
}
