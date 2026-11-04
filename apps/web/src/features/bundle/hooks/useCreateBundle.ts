'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { useCreateBundleMutation } from '../queries/bundles';

const MIN_MEMBERS = 2;

const notify = (message: string) => toast(message, { fullWidth: true });

/**
 * 고른 사진으로 번들 초안을 만들고 작성 화면으로 이동(사진함 「번들 만들기」와 번들 만들기 화면이 함께 씀)
 * 성공하면 이동이 끝날 때까지 creating을 유지해 중복 요청을 막고, 실패하면 안내만 하고 선택은 그대로 둠
 */
export function useCreateBundle() {
  const router = useRouter();
  const { data: profile } = useQuery(myProfileQueryOptions());
  const bunchId = profile?.bunch?.id;
  const { data: members } = useQuery(bunchMembersQueryOptions(bunchId));
  const mutation = useCreateBundleMutation(bunchId);
  // 같은 틱에 연달아 호출돼도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const submitted = useRef(false);

  const create = (photoIds: readonly string[]) => {
    if (submitted.current || photoIds.length === 0) return;
    submitted.current = true;
    mutation.mutate(photoIds, {
      onSuccess: (bundle) => router.push(BUNDLE_SELECT_PATHS.draft(bundle.id)),
      onError: (error) => {
        // 실패하면 다시 시도할 수 있게 풂(성공은 이동이 끝날 때까지 유지)
        submitted.current = false;
        const code = (error as { code?: string }).code;
        if (code === 'BUNDLE_001') {
          // 번치 인원 부족과 초안 한도가 같은 코드라, 번치 멤버가 모자라면 인원 안내 아니면 한도 안내
          notify(
            members !== undefined && members.length < MIN_MEMBERS
              ? BUNDLE_SELECT_MESSAGES.membersRequired
              : BUNDLE_SELECT_MESSAGES.draftLimit,
          );
        } else notify(BUNDLE_SELECT_MESSAGES.createFailed);
      },
    });
  };

  return { create, creating: mutation.isPending || mutation.isSuccess };
}
