import type { ReactNode } from 'react';
import { BundleSelectLayout } from '@/features/bundle/components/bundles/BundleSelectLayout';

export default function BundleSelectRouteLayout({ children }: { children: ReactNode }) {
  return <BundleSelectLayout>{children}</BundleSelectLayout>;
}
