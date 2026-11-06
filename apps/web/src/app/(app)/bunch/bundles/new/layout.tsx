import type { ReactNode } from 'react';
import { BundleSelectLayout } from '@/features/bundle/components';

export default function BundleSelectRouteLayout({ children }: { children: ReactNode }) {
  return <BundleSelectLayout>{children}</BundleSelectLayout>;
}
