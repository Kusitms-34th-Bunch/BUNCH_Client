import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'web',
};

// iOS에서 env(safe-area-inset-*)가 값을 돌려주려면 viewport-fit=cover 필요
export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 네이티브 쉘이 hydration 전에 html.style에 기기별 Safe Area를 주입함
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
