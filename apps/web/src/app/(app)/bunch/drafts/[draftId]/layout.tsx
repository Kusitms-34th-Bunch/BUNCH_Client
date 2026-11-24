import type { ReactNode } from 'react';
import { DraftMissingGate } from '@/features/bundle/components/drafts/DraftMissingGate';
import { DraftProvider } from '@/features/bundle/contexts/DraftProvider';
import { parseDraftId } from '@/features/bundle/lib/draftId';

type BundleDraftLayoutProps = {
  children: ReactNode;
  params: Promise<{ draftId: string }>;
};

// 작성 화면과 참여 멤버 관리 화면이 같은 초안 상태를 보도록 이 초안 흐름을 하나의 provider로 감쌈
export default async function BundleDraftLayout({ children, params }: BundleDraftLayoutProps) {
  const draftId = parseDraftId((await params).draftId);

  return (
    <DraftProvider draftId={draftId}>
      {/* 번들이 삭제됐거나 다른 멤버가 업로드하면 어느 화면에서든 안내 창(그동안 아래 화면은 그리지 않음) */}
      <DraftMissingGate draftId={draftId}>{children}</DraftMissingGate>
    </DraftProvider>
  );
}
