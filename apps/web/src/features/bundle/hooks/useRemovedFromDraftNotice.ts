'use client';

import { toast } from '@app/design-system';
import { useIsMutating } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { bundleMutationKeys } from '../queries/keys';

/**
 * 편집 중 참여 멤버에서 빠지면 바로 보기 전용이 되고 안내(기능 spec 4.3.2). 내가 직접 나가는 중에는 이동하므로 안내하지 않음
 * `editing`은 초안을 받았고 아직 초안 상태인지(그 밖에는 참여 여부 기록도 바꾸지 않음)
 */
export function useRemovedFromDraftNotice(editing: boolean, isParticipant: boolean) {
  const leaving = useIsMutating({ mutationKey: bundleMutationKeys.leave }) > 0;
  const wasParticipant = useRef(false);
  useEffect(() => {
    if (!editing) return;
    if (wasParticipant.current && !isParticipant && !leaving) {
      toast(BUNDLE_MESSAGES.removedFromDraft);
    }
    wasParticipant.current = isParticipant;
  }, [editing, isParticipant, leaving]);
}
