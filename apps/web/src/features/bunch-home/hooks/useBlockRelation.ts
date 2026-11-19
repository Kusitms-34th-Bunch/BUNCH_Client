import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { blockedBunchesQueryOptions } from '../queries/blocks';

type BlockAccess = 'checking' | 'blocked' | 'visible';

/**
 * 지금 내 번치(`members/me` 기본 번치)가 이 번치를 차단했는지(서버 차단 목록 전체, 못 찾으면 끝까지 이어서 받음)
 * 상대가 나를 차단한 경우는 그 번치 응답(403)으로 화면이 따로 판단. 명의·목록을 모르는 동안은 checking(내용을 그리지 않음)
 */
export function useBlockRelation(bunchId: string) {
  const me = useQuery(myProfileQueryOptions());
  const viewerId = me.data ? (me.data.bunch?.id ?? null) : undefined;
  const blocks = useInfiniteQuery(blockedBunchesQueryOptions(viewerId));
  const blocked =
    blocks.data?.pages.some((page) =>
      page.items.some((item) => String(item.bunch.id) === bunchId),
    ) ?? false;
  // 받은 쪽에 없고 남은 쪽이 있으면 이어서 받음(다음 쪽이 실패하면 아래 실패 기준대로 보임)
  const searching = !blocked && blocks.hasNextPage && !blocks.isFetchNextPageError;
  const { isFetching, fetchNextPage } = blocks;
  // 재조회 중에는 기다림(다음 쪽 요청이 진행 중인 재조회를 취소하지 않게)
  useEffect(() => {
    if (searching && !isFetching) void fetchNextPage();
  }, [searching, isFetching, fetchNextPage]);
  let access: BlockAccess = 'checking';
  // 내 정보·목록을 못 받으면 차단 여부를 몰라도 화면은 보임(오류 안내는 화면 쪽, 서버가 다시 막음)
  if (
    viewerId === null ||
    viewerId === '' ||
    (viewerId === undefined && me.isError) ||
    blocks.isError
  ) {
    access = 'visible';
  }
  if (blocks.data) access = blocked ? 'blocked' : searching ? 'checking' : 'visible';
  return {
    /** checking: 차단 여부를 아직 모름, blocked: 내가 차단함, visible: 볼 수 있음 */
    access,
    /** 지금 내 번치(신고 명의). 모르거나 없으면 undefined */
    me: me.data?.bunch ?? undefined,
  };
}
