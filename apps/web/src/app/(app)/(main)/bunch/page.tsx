import type { Metadata } from 'next';
import { BunchHome } from '@/features/bunch-home/components';

// 번치 멤버의 개인 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default function BunchPage() {
  return <BunchHome />;
}
