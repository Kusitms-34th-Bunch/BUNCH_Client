import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { BundleEditProvider } from '@/features/bundle/contexts/BundleEditProvider';
import { isWireId } from '@/shared/api/client/ids';

type BundleEditLayoutProps = {
  children: ReactNode;
  params: Promise<{ bunchId: string; bundleId: string }>;
};

// 수정 화면과 수정 중 사진 추가 화면이 같은 편집 값을 보도록 이 수정 흐름을 하나의 provider로 감쌈
export default async function BundleEditLayout({ children, params }: BundleEditLayoutProps) {
  const { bunchId, bundleId } = await params;
  // 서버 숫자 id로 바꿀 수 없는 주소는 요청 전에 막음
  if (!isWireId(bunchId) || !isWireId(bundleId)) notFound();

  return (
    <BundleEditProvider bunchId={bunchId} bundleId={bundleId}>
      {children}
    </BundleEditProvider>
  );
}
