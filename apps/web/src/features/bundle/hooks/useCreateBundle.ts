'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { clearPhotoBoxSelection } from '@/features/photo-box/lib/selectionResume';
import { apiErrorCode, isDefiniteRejection } from '@/shared/api/client/errorStatus';
import { createIdempotencyKey } from '@/shared/api/client/idempotencyKey';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { useCreateBundleMutation, useFetchLatestBunchMembers } from '../queries/bundles';
import { useNeedMembersDialog } from './useBundleEntryCheck';

const MIN_MEMBERS = 2;

const notify = (message: string) => toast(message);

type CreateOptions = {
  /** 서버에 없는 사진이 있어 거절됐을 때(PHOTO_004) 그 사진함 사진 id, 호출하는 쪽이 선택에서 뺌 */
  onMissingPhotos?: ((_photoIds: readonly string[]) => void) | undefined;
  /** 사진함에서 넘어온 흐름은 멤버 선택을 기록에서 빼, 작성 화면의 뒤로 가기가 사진함으로 가게 함 */
  replace?: boolean | undefined;
  /** 마지막으로 적용한 추천 번들 id(번들 만들기 화면만 넘김) */
  recommendationId?: string | undefined;
};

// PHOTO_004의 detail.missingPhotoIds, 형식이 다르면 빈 목록
const readMissingPhotoIds = (error: unknown): readonly string[] => {
  const body = (error as { data?: { error?: { detail?: { missingPhotoIds?: unknown } } } }).data;
  const ids = body?.error?.detail?.missingPhotoIds;
  return Array.isArray(ids)
    ? ids.filter((id): id is number => typeof id === 'number').map(String)
    : [];
};

/**
 * 고른 사진과 참여 멤버로 번들 초안을 만들고 작성 화면으로 이동(사진함 「번들 만들기」와 번들 만들기 화면이 함께 씀)
 * 성공하면 이동이 끝날 때까지 creating을 유지해 중복 요청을 막고, 실패하면 안내만 하고 선택은 그대로 둠
 */
export function useCreateBundle() {
  const router = useRouter();
  const { data: profile } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const { data: members } = useQuery(bunchMembersQueryOptions(bunchId));
  const fetchLatestMembers = useFetchLatestBunchMembers();
  const openNeedMembers = useNeedMembersDialog();
  const mutation = useCreateBundleMutation(bunchId);
  // 같은 틱에 연달아 호출돼도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const submitted = useRef(false);
  // 같은 사진으로 다시 보낼 때 같은 멱등 키를 써서, 응답이 유실돼도 초안이 둘 만들어지지 않게 함
  const attempt = useRef<{ signature: string; key: string } | undefined>(undefined);

  const create = (
    photoIds: readonly string[],
    participantMemberIds: readonly string[],
    { onMissingPhotos, replace = false, recommendationId }: CreateOptions = {},
  ) => {
    if (submitted.current || photoIds.length === 0 || participantMemberIds.length === 0) return;
    submitted.current = true;
    // 사진과 참여자 순서까지 같아야 같은 요청(서버가 다르면 REQUEST_001)
    const signature = `${photoIds.join(',')}|${participantMemberIds.join(',')}|${recommendationId ?? ''}`;
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: createIdempotencyKey() };
    }
    mutation.mutate(
      { photoIds, participantMemberIds, recommendationId, idempotencyKey: attempt.current.key },
      {
        onSuccess: (bundle) => {
          // 같은 사진으로 다시 만들면 새 초안이 되도록 키를 비움(이동이 끝날 때까지는 submitted가 중복을 막음)
          attempt.current = undefined;
          // 초안을 만들었으면 사진함 선택 모드는 끝남(작성 화면에서 뒤로 와도 선택이 남지 않게 함)
          clearPhotoBoxSelection();
          // 사진함에서 넘어온 흐름은 기록에서 멤버 선택을 빼고(뒤로가기가 사진함으로), 번치 홈에서 만든 흐름은 뒤로가기가 번치 홈으로 가게 표시함
          if (replace) router.replace(BUNDLE_SELECT_PATHS.draft(bundle.id));
          else router.push(BUNDLE_SELECT_PATHS.draftFromHome(bundle.id));
        },
        onError: (error) => {
          // 실패하면 다시 시도할 수 있게 풂(성공은 이동이 끝날 때까지 유지)
          submitted.current = false;
          const code = apiErrorCode(error);
          // 서버가 확정 거절한 경우만 다음 시도를 새 요청으로(같은 키면 거절이 다시 재생될 수 있음)
          // 응답 없음·5xx·408·429는 이미 처리됐을 수 있어 키 유지(새 키면 초안이 한 번 더 생김)
          if (isDefiniteRejection(error)) attempt.current = undefined;
          if (code === 'PHOTO_004') {
            // 고른 사진 일부 또는 전부가 서버에 없음(사진함에서 지워짐): 선택에서 빼고 다시 고르게 안내
            const missing = readMissingPhotoIds(error);
            onMissingPhotos?.(missing);
            notify(BUNDLE_SELECT_MESSAGES.selectionStale(missing.length || 1));
          } else if (code === 'BUNDLE_001') {
            // 번치 인원 부족과 초안 한도가 같은 코드라 멤버 목록을 새로 받아 구분(그사이 멤버가 나갔을 수 있음)
            // 멤버가 모자라면 「함께할 멤버가 없어요」 창(기능명세 4.1.4 예외 처리), 아니면 한도 안내
            void fetchLatestMembers(bunchId)
              .then(
                (latest) => latest.length,
                () => members?.length,
              )
              .then((count) => {
                if (count !== undefined && count < MIN_MEMBERS) openNeedMembers();
                else notify(BUNDLE_SELECT_MESSAGES.draftLimit);
              });
          } else notify(BUNDLE_SELECT_MESSAGES.createFailed);
        },
      },
    );
  };

  return { create, creating: mutation.isPending || mutation.isSuccess };
}
