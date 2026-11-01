import type { ReactNode } from 'react';
import { DraftProvider } from '@/features/bundle/contexts/DraftProvider';
import { parseDraftId } from '@/features/bundle/lib/draftId';

type BundleDraftLayoutProps = {
  children: ReactNode;
  params: Promise<{ draftId: string }>;
};

// 작성 화면과 참여 멤버 관리 화면이 같은 초안 상태를 보도록 이 초안 흐름을 하나의 provider로 감쌈
export default async function BundleDraftLayout({ children, params }: BundleDraftLayoutProps) {
  const { draftId } = await params;

  return <DraftProvider draftId={parseDraftId(draftId)}>{children}</DraftProvider>;
}
