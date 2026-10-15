import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'web',
};

// viewport-fit=cover가 있어야 iOS에서 env(safe-area-inset-*)가 실제 값을 돌려준다.
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
