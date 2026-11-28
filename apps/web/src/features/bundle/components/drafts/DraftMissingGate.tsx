'use client';

import type { ReactNode } from 'react';
import { ConfirmDialog } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';

/**
 * 삭제·다른 멤버 업로드로 편집할 수 없을 때 안내 창(Figma `5618:81986`·`81997`). 「확인」만 있고 업로드면 그 번들 상세, 삭제면 번치 홈의 「작성 중인 번들」 탭으로 이동
 * 창이 떠 있는 동안 아래 화면은 그리지 않음(준비 전 화면의 로딩 덮개가 창을 덮어 「확인」이 눌리지 않던 문제)
 */
type DraftMissingGateProps = {
  /** 이 초안의 번들 id(업로드됐을 때 상세 주소, route가 형식을 검증한 값. 형식이 틀렸으면 undefined) */
  draftId: string | undefined;
  children: ReactNode;
};

export function DraftMissingGate({ draftId, children }: DraftMissingGateProps) {
  const router = useRouter();
  const { state } = useDraftContext();
  // 초안을 받을 때 쓴 내 기본 번치(이미 받아 둔 캐시)
  const { data: profile } = useQuery(myProfileQueryOptions());
  const missing = state.kind === 'missing' ? state : undefined;
  const published = missing?.reason === 'published';
  const bunchId = profile?.bunch?.id;
  const target = !published
    ? BUNDLE_PATHS.bunchHomeDrafts
    : bunchId && draftId
      ? BUNDLE_PATHS.publishedDetail(bunchId, draftId)
      : BUNDLE_PATHS.bunchHome;

  return (
    <>
      <ConfirmDialog
        open={missing !== undefined}
        onOpenChange={() => undefined}
        appearance="text"
        title={published ? BUNDLE_MESSAGES.publishedDraftTitle : BUNDLE_MESSAGES.deletedDraftTitle}
        description={
          published
            ? BUNDLE_MESSAGES.publishedDraftDescription(missing?.publisherNickname)
            : BUNDLE_MESSAGES.deletedDraftDescription
        }
        confirmLabel={BUNDLE_MESSAGES.missingDraftConfirm}
        onConfirm={() => router.replace(target)}
      />
      {missing ? null : children}
    </>
  );
}
