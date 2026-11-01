import type { Metadata } from 'next';
import { BundleSelect } from '@/features/bundle/components';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';

// 번치 멤버의 개인 사진을 고르는 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번들 만들기', robots: { index: false } };

export default function BundleSelectPage() {
  return (
    <div
      data-ssgoi-transition={BUNDLE_SELECT_PATHS.select}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleSelect />
    </div>
  );
}
