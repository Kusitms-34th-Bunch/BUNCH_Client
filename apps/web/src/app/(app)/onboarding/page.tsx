import type { Metadata } from 'next';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BunchStartSelect } from '@/features/onboarding/components';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';

// 계정 흐름이라 검색에서 제외
export const metadata: Metadata = { title: '번치 시작하기', robots: { index: false } };

type OnboardingPageProps = {
  searchParams: Promise<{ from?: string | string[] }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  // 번치 홈에서 들어온 경우만 닫기(X)가 이전 화면으로 돌아감. 그 밖의 값은 무시
  const { from } = await searchParams;

  return (
    <div
      data-ssgoi-transition={ONBOARDING_PATHS.start}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchStartSelect
        closeBackHref={
          from === ONBOARDING_PATHS.startFromBunchQuery ? BUNCH_HOME_PATHS.home : undefined
        }
      />
    </div>
  );
}
