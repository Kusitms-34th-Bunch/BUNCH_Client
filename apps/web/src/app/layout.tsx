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
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
