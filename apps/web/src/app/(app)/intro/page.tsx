import type { Metadata } from 'next';
import { IntroScreen } from '@/features/auth/components';
import { INTRO_PATH } from '@/features/auth/constants/paths';

export const metadata: Metadata = { title: '시작하기', robots: { index: false } };

export default function IntroPage() {
  return (
    <div data-ssgoi-transition={INTRO_PATH} className="flex h-full min-h-0 flex-1 flex-col">
      <IntroScreen />
    </div>
  );
}
