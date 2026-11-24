'use client';

import type { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@app/design-system';
import { useRef, useState } from 'react';
import { createIdempotencyKey } from '@/shared/api/client/idempotencyKey';
import type { PublishOutcome } from '../lib/draftContract';
import type { DraftVisibility } from '../lib/types';
import type { BundleDetail } from '../model/bundle';
import type { usePublishBundleMutation } from '../queries/bundles';
import type { useDraftAutosave } from './useDraftAutosave';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { pickNewerDetail } from '../lib/draftMapping';
import { classifyPublishError } from '../lib/publish';

const toDraftVisibility = (value: 'PUBLIC' | 'PRIVATE' | null): DraftVisibility | null =>
  value === null ? null : value === 'PUBLIC' ? 'public' : 'members';

type Options = {
  /** 보내는 중인 위치 변경이 모두 끝나길 기다림(거절·실패, 보낸 요청이 있었는지) */
  settlePlaces: () => Promise<{ failed: boolean; sent: boolean }>;
  /** 보내는 중인 사진 변경이 모두 끝나길 기다림 */
  settlePhotos: () => Promise<{ failed: boolean }>;
  autosave: Pick<ReturnType<typeof useDraftAutosave>, 'cancelScheduled' | 'flush'>;
  refetchDetail: () => Promise<QueryObserverResult<BundleDetail>>;
  /** 저장·사진 대기열과 함께 기준으로 삼는 최신 상세(발행 직전 다시 받은 값으로 바로 갱신) */
  readDetail: () => BundleDetail | undefined;
  writeDetail: (_next: BundleDetail) => void;
  /** 업로드 직전 공개 범위 화면에서 고른 값(고르기 전에는 서버의 초안 값) */
  visibilityChoice: DraftVisibility | undefined;
  publishMutation: ReturnType<typeof usePublishBundleMutation>;
};

/**
 * 번들 발행: 보내는 중인 위치·사진 변경과 저장하지 못한 입력이 모두 끝난 서버 구성으로 발행(기능 spec 4.3.9·4.3.12)
 * 발행 단계(`publishPhase`)는 응답 전 캐시가 먼저 PUBLISHED로 바뀌어도 「업로드됐어요」 창을 띄우지 않는 데 씀
 */
export function useDraftPublish({
  settlePlaces,
  settlePhotos,
  autosave,
  refetchDetail,
  readDetail,
  writeDetail,
  visibilityChoice,
  publishMutation,
}: Options) {
  // 발행 요청 중(publishing): 응답 전에 캐시가 먼저 PUBLISHED로 바뀌어도 「업로드됐어요」 창을 띄우지 않음
  // 내가 발행한 뒤(published): 「없는 초안」 안내 없이 이동을 기다림
  const [publishPhase, setPublishPhase] = useState<'idle' | 'publishing' | 'published'>('idle');
  // 네트워크 오류 뒤 같은 내용으로 다시 업로드할 때 같은 요청 키를 써서 한 번만 발행되게 함(기능 spec 4.3.9·4.3.12)
  const publishAttempt = useRef<{ signature: string; key: string } | undefined>(undefined);

  const publish = async (): Promise<PublishOutcome> => {
    // 보내는 중인 위치 변경이 끝난 뒤의 서버 구성으로 발행함(위치 변경이 발행보다 늦게 도착하지 않도록)
    const placeResult = await settlePlaces();
    // 위치 변경이 거절·실패했으면(알림은 그때 이미 띄움) 서버에 반영되지 않은 구성으로 발행하지 않음
    if (placeResult.failed) return 'blocked';
    // 위치 응답은 상세 revision을 올리지 않으므로 보낸 요청이 있었으면 최신 상세로 맞춘 뒤 발행함
    if (placeResult.sent) {
      const refreshed = await refetchDetail();
      // 최신 상세를 받지 못하면 낡은 revision으로 발행을 시도하지 않음
      if (refreshed.isError || !refreshed.data) {
        toast(BUNDLE_MESSAGES.saveFailed);
        return 'failed';
      }
      // effect가 ref를 갱신하기를 기다리지 않고 받은 상세를 바로 기준으로 삼음
      writeDetail(pickNewerDetail(readDetail(), refreshed.data));
    }
    // 보내는 중인 사진 변경이 끝난 뒤의 서버 구성으로 발행함
    const photoResult = await settlePhotos();
    if (photoResult.failed) {
      toast(BUNDLE_MESSAGES.photosChangeFailed);
      return 'blocked';
    }
    autosave.cancelScheduled();
    // 저장하지 못한 입력이 남아 있으면 발행하지 않음(서버는 저장된 내용만 발행함)
    // 진행 중이던 저장이 막 끝나는 순간 들어온 입력이 남을 수 있어 한 번 더 확인
    let saved = await autosave.flush();
    if (!saved) saved = await autosave.flush();
    if (!saved) {
      toast(BUNDLE_MESSAGES.saveFailed);
      return 'failed';
    }
    const latest = readDetail();
    if (!latest) return 'failed';
    const chosen = visibilityChoice ?? toDraftVisibility(latest.visibility);
    if (chosen === null) {
      toast(BUNDLE_MESSAGES.uploadIncomplete);
      return 'blocked';
    }
    // 같은 키에 다른 내용을 보내면 서버가 거절하므로 범위나 revision이 바뀌면 새 키를 씀
    const visibility = chosen === 'public' ? 'PUBLIC' : 'PRIVATE';
    const signature = `${visibility}:${latest.revision}`;
    if (publishAttempt.current?.signature !== signature) {
      publishAttempt.current = { signature, key: createIdempotencyKey() };
    }
    setPublishPhase('publishing');
    try {
      await publishMutation.mutateAsync({
        visibility,
        expectedRevision: latest.revision,
        idempotencyKey: publishAttempt.current.key,
      });
      publishAttempt.current = undefined;
      setPublishPhase('published');
      return 'published';
    } catch (error) {
      // 먼저 끝난 발행이 있으면 발행 완료 상태 유지
      setPublishPhase((phase) => (phase === 'published' ? phase : 'idle'));
      const { outcome, message, keepKey } = classifyPublishError(error);
      if (!keepKey) publishAttempt.current = undefined;
      toast(message);
      return outcome;
    }
  };

  return { publishPhase, publish };
}
