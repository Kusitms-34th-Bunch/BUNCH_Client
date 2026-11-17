import { queryOptions, skipToken } from '@tanstack/react-query';
import { issueBunchInvitation } from '../api/bunchInvitation';
import { sharedKeys } from './keys';

/**
 * 번치의 유효한 초대 링크(번치를 모르면 요청하지 않음). 번치 만들기 직후 초대와 멤버 초대 화면이 함께 씀
 * 링크는 7일 유효하고 같은 링크를 돌려주므로 포커스 복귀·재연결로 다시 받지 않음
 */
export const bunchInvitationQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchInvitation(bunchId),
    queryFn: bunchId ? ({ signal }) => issueBunchInvitation(bunchId, signal) : skipToken,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60_000,
  });
