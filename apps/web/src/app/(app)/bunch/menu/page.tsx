import type { Metadata } from 'next';
import { BunchMenu } from '@/features/bunch-home/components';

// 번치 관리 메뉴라 검색에서 제외(접근 guard는 로그인·번치 API 연결 때 추가)
export const metadata: Metadata = { title: '번치 더보기', robots: { index: false } };

export default function BunchMenuPage() {
  return <BunchMenu />;
}
