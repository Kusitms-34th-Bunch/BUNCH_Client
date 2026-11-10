'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { useCreateBundleMutation } from '../queries/bundles';

const MIN_MEMBERS = 2;

const notify = (message: string) => toast(message);

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
  // 같은 사진으로 다시 보낼 때 같은 멱등 키를 써서, 응답이 유실돼도 초안이 둘 만들어지지 않게 함
  const attempt = useRef<{ signature: string; key: string } | undefined>(undefined);

  const create = (photoIds: readonly string[]) => {
    if (submitted.current || photoIds.length === 0) return;
    submitted.current = true;
    const signature = photoIds.join(',');
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: createIdempotencyKey() };
    }
    mutation.mutate(
      { photoIds, idempotencyKey: attempt.current.key },
      {
        onSuccess: (bundle) => {
          // 같은 사진으로 다시 만들면 새 초안이 되도록 키를 비움(이동이 끝날 때까지는 submitted가 중복을 막음)
          attempt.current = undefined;
          router.push(BUNDLE_SELECT_PATHS.draft(bundle.id));
        },
        onError: (error) => {
          // 실패하면 다시 시도할 수 있게 풂(성공은 이동이 끝날 때까지 유지)
          submitted.current = false;
          const code = (error as { code?: string }).code;
          // 서버가 요청을 거절한 경우(4xx)는 다음 시도를 새 요청으로(같은 키면 거절이 다시 재생될 수 있음), 응답이 없거나 5xx면 키를 유지
          const status = (error as { status?: number }).status;
          if (status !== undefined && status >= 400 && status < 500) attempt.current = undefined;
          if (code === 'BUNDLE_001') {
            // 번치 인원 부족과 초안 한도가 같은 코드라, 번치 멤버가 모자라면 인원 안내 아니면 한도 안내
            notify(
              members !== undefined && members.length < MIN_MEMBERS
                ? BUNDLE_SELECT_MESSAGES.membersRequired
                : BUNDLE_SELECT_MESSAGES.draftLimit,
            );
          } else notify(BUNDLE_SELECT_MESSAGES.createFailed);
        },
      },
    );
  };

  return { create, creating: mutation.isPending || mutation.isSuccess };
}
