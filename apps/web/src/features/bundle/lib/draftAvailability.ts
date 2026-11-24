import { apiErrorCode } from '@/shared/api/client/errorStatus';
import type { BundleDetail } from '../model/bundle';

type Input = {
  bundleId: string | undefined;
  profile: { bunch?: unknown } | undefined;
  profileError: boolean;
  bunchMembers: readonly unknown[] | undefined;
  membersError: boolean;
  /** 내가 이 번치의 멤버로 확인됐는지 */
  hasViewer: boolean;
  detail: BundleDetail | undefined;
  detailIsError: boolean;
  detailError: unknown;
  publishPhase: 'idle' | 'publishing' | 'published';
};

/**
 * 초안을 볼 수 없는지(missing: 없는·삭제된·남이 업로드한 초안, 볼 권한 없음)와 다시 시도할 오류인지(failed)
 * 기본 번치가 없거나 내가 그 번치 멤버가 아니면 볼 수 없어 없는 초안과 같은 안내로 이동
 */
export const draftAvailability = ({
  bundleId,
  profile,
  profileError,
  bunchMembers,
  membersError,
  hasViewer,
  detail,
  detailIsError,
  detailError,
  publishPhase,
}: Input) => {
  const noAccess =
    (profile !== undefined && !profile.bunch) ||
    (bunchMembers !== undefined && profile !== undefined && !hasViewer);
  const missing =
    bundleId === undefined ||
    noAccess ||
    (detailIsError && ['RESOURCE_001', 'AUTH_002'].includes(apiErrorCode(detailError) ?? '')) ||
    (detail?.status === 'PUBLISHED' && publishPhase === 'idle');
  // 번치 멤버는 받아 둔 목록이 있으면 다시 받기에 실패해도 그대로 씀(참여 멤버 관리에 들어올 때마다 다시 받음, 상세와 같은 기준)
  const failed =
    profileError ||
    (membersError && bunchMembers === undefined) ||
    (detailIsError && !missing && detail === undefined);
  return { missing, failed };
};
