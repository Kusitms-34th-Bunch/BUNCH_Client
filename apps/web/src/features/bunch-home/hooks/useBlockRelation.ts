import { useQuery } from '@tanstack/react-query';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { blockedBunchesQueryOptions } from '../queries/blocks';

type BlockAccess = 'checking' | 'blocked' | 'visible';

/**
 * 지금 내 번치(`members/me` 기본 번치)가 이 번치를 차단했는지(서버 차단 목록 첫 쪽 기준)
 * 상대가 나를 차단한 경우는 그 번치 응답(403)으로 화면이 따로 판단. 명의·목록을 모르는 동안은 checking(내용을 그리지 않음)
 */
export function useBlockRelation(bunchId: string) {
  const me = useQuery(myProfileQueryOptions());
  const viewerId = me.data ? (me.data.bunch?.id ?? null) : undefined;
  const blocks = useQuery(blockedBunchesQueryOptions(viewerId));
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
  if (blocks.data) {
    // ponytail: 첫 쪽(50개)만 확인, 더 차단했으면 그 번치는 서버 응답(403)으로만 막힘
    const blocked = blocks.data.items.some((item) => String(item.bunch.id) === bunchId);
    access = blocked ? 'blocked' : 'visible';
  }
  return {
    /** checking: 차단 여부를 아직 모름, blocked: 내가 차단함, visible: 볼 수 있음 */
    access,
    /** 지금 내 번치(신고 명의). 모르거나 없으면 undefined */
    me: me.data?.bunch ?? undefined,
  };
}
