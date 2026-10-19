import Link from 'next/link';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { PageShell } from '@/shared/components/layout/PageShell';

export default function HomePage() {
  return (
    <PageShell>
      <div className="gap-s8 flex h-full flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold">web</h1>
        {/* 온보딩 개발 확인용 임시 진입점 */}
        <Link
          href={ONBOARDING_PATHS.start}
          className="bg-surface-brand text-text-inversed rounded-r4 px-s8 h-s18 typography-label-l focus-visible:outline-border-brand inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          온보딩 시작 (임시)
        </Link>
      </div>
    </PageShell>
  );
}
