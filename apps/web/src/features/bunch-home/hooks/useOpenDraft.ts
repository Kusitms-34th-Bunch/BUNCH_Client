import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';

/** 초안 상세를 미리 받아 상태를 돌려줌(bundle feature의 query라 부르는 쪽이 조합). 없는 초안이면 reject */
export type PrefetchDraft = (_bundleId: string) => Promise<{ status: 'DRAFT' | 'PUBLISHED' }>;

// 상세 응답을 기다리는 최대 시간. 넘으면 그냥 이동(작성 화면이 받고 없는 초안을 안내)
const PREFETCH_WAIT_MS = 400;

type Gone = 'deleted' | 'published' | undefined;

type OpenDraftOptions = {
  prefetchDraft: PrefetchDraft;
  /** 이미 삭제·발행된 초안을 눌렀을 때 목록 다시 받기 */
  onGone: () => void;
};

/**
 * 작성 중인 번들 카드 → 공동 편집(5.3.1 상세 동작 3). 상세를 먼저 받아 이미 삭제됐으면 「삭제된 번들이에요.」,
 * 이미 발행됐으면 「발행된 번들이에요.」를 띄우고 이동 대신 목록을 갱신(5.3.1 예외 처리)
 * ponytail: 400ms 안에 답이 없으면 확인 없이 이동, 늦게 알게 된 경우는 작성 화면의 안내가 맡음
 */
export function useOpenDraft({ prefetchDraft, onGone }: OpenDraftOptions) {
  const router = useRouter();
  // 확인을 기다리는 동안 다시 누르면 무시, 그 사이 화면을 떠나면 이동하지 않음
  const opening = useRef(false);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return async (bundleId: string) => {
    if (opening.current) return;
    opening.current = true;
    const checked = prefetchDraft(bundleId).then(
      (draft): Gone => (draft.status === 'PUBLISHED' ? 'published' : undefined),
      (error: unknown): Gone =>
        isApiError(error) && (error.status === 404 || error.code === 'RESOURCE_001')
          ? 'deleted'
          : undefined,
    );
    const timeout = new Promise<Gone>((resolve) =>
      setTimeout(() => resolve(undefined), PREFETCH_WAIT_MS),
    );
    const gone = await Promise.race([checked, timeout]);
    opening.current = false;
    if (!mounted.current) return;
    if (!gone) {
      router.push(BUNCH_HOME_PATHS.draft(bundleId));
      return;
    }
    toast(
      gone === 'published'
        ? BUNCH_HOME_MESSAGES.draftGonePublished
        : BUNCH_HOME_MESSAGES.draftGoneDeleted,
    );
    onGone();
  };
}
