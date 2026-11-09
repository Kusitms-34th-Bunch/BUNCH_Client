'use client';

import { ConfirmDialog } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';

/**
 * 작성 중이던 번들이 삭제됐거나 다른 멤버가 업로드해 더 이상 편집할 수 없을 때 안내 창(Figma `5618:81986`·`81997`)
 * 초안 흐름의 어느 화면에 있든 같은 창이 뜨고, 「확인」을 눌러야 번치 홈으로 이동(창 밖을 눌러도 닫히지 않음)
 */
export function DraftMissingGate() {
  const router = useRouter();
  const { state } = useDraftContext();
  const published = state.kind === 'missing' && state.reason === 'published';

  return (
    <ConfirmDialog
      open={state.kind === 'missing'}
      onOpenChange={() => undefined}
      appearance="text"
      title={published ? BUNDLE_MESSAGES.publishedDraftTitle : BUNDLE_MESSAGES.deletedDraftTitle}
      description={
        published
          ? BUNDLE_MESSAGES.publishedDraftDescription
          : BUNDLE_MESSAGES.deletedDraftDescription
      }
      confirmLabel={BUNDLE_MESSAGES.missingDraftConfirm}
      onConfirm={() => router.replace(BUNDLE_PATHS.bunchHome)}
    />
  );
}
