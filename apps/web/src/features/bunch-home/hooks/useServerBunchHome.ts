'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { BunchHomeDetail, BunchSummary } from '../lib/types';
import { toBunchHomeDetail } from '../model/bunchHome';
import { bunchHomeQueryOptions, publishedBundlesQueryOptions } from '../queries/bunchHome';

export type ServerBunchHome =
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  /** 소속 번치가 없음(번치 없음 화면) */
  | { kind: 'no-bunch' }
  | { kind: 'ready'; current: BunchHomeDetail; summary: BunchSummary };

type Options = {
  /** false면 요청하지 않음(샘플 데이터로 보는 테스트·미리보기) */
  enabled?: boolean;
};

/**
 * 번치 홈의 프로필·개수와 완성된 번들을 서버(가짜 서버 포함)에서 받아 화면 모양으로 돌려줌
 * 내 기본 번치(`members/me`)를 지금 번치로 보고, 번치 전환·팔로우·알림·멤버 관리는 아직 샘플이라 이 hook 밖에 있음
 */
export function useServerBunchHome({ enabled = true }: Options = {}): ServerBunchHome {
  const profile = useQuery({ ...myProfileQueryOptions(), enabled });
  const bunchId = enabled ? profile.data?.bunch?.id : undefined;
  const home = useQuery(bunchHomeQueryOptions(bunchId));
  const published = useQuery(publishedBundlesQueryOptions(bunchId));

  const ready = useMemo(() => {
    if (!home.data || !published.data) return undefined;
    const current = toBunchHomeDetail(home.data, published.data);
    if (!current) return undefined;
    const summary: BunchSummary = {
      id: current.id,
      name: current.name,
      imageSrc: current.imageSrc,
      alertCount: home.data.unreadCount ?? 0,
      access: 'active',
    };
    return { current, summary };
  }, [home.data, published.data]);

  if (profile.data && !profile.data.bunch) return { kind: 'no-bunch' };
  if (ready) return { kind: 'ready', ...ready };
  // 내 번치가 아닌 응답(소속 null)이라 변환하지 못한 경우도 처음부터 못 받은 오류로 봄
  const unusable = home.data && published.data && !ready;
  // 이미 받은 값이 있으면 재조회 실패로 화면을 덮지 않고, 처음부터 못 받았을 때만 오류
  if (unusable || profile.isError || home.isError || published.isError) {
    return {
      kind: 'error',
      retry: () => {
        if (profile.isError) void profile.refetch();
        // 응답은 받았지만 쓸 수 없는 경우(isError 아님)에도 다시 받음
        if (home.isError || unusable) void home.refetch();
        if (published.isError || unusable) void published.refetch();
      },
    };
  }
  return { kind: 'loading' };
}
