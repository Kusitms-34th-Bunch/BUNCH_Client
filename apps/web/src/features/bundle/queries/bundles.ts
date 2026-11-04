import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import type { BundleDetail } from '../model/bundle';
import {
  addBundleParticipant,
  createBundle,
  getBundle,
  publishBundle,
  readVersionConflict,
  removeBundleParticipant,
  saveBundleCaption,
  saveBundleComment,
  saveBundleDate,
  saveBundleTitle,
  saveBundleVisibility,
} from '../api/bundles';
import { bundleKeys } from './keys';

/** 번들(초안·발행본) 상세. 번치나 번들을 아직 모르면 요청하지 않음(skipToken) */
export const bundleQueryOptions = (bunchId: string | undefined, bundleId: string | undefined) =>
  queryOptions({
    queryKey: bundleKeys.detail(bunchId, bundleId),
    queryFn: bunchId && bundleId ? ({ signal }) => getBundle(bunchId, bundleId, signal) : skipToken,
  });

/**
 * 초안 생성. 성공하면 응답으로 상세 캐시를 채워 이동 직후 바로 보여 줌
 * 실패 문구는 코드별(BUNDLE_001 등)로 달라 meta 없이 화면이 `mutate(…, { onError })`로 처리
 * 같은 멱등 키 재전송 규칙상 호출마다 새 키를 만들므로 중복 요청은 화면이 막음
 */
export const useCreateBundleMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: readonly string[]) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return createBundle(bunchId, photoIds, createIdempotencyKey());
    },
    onSuccess: (bundle) =>
      queryClient.setQueryData(bundleKeys.detail(bundle.bunchId, bundle.id), bundle),
  });
};

// 저장·참여자 변경 성공 응답(전체 BundleSnapshot)으로 상세 캐시를 바로 갱신하고,
// 버전 충돌이면 서버의 최신 상세를 다시 받아 화면이 최신 버전으로 이어서 저장하게 함
const useBundleCacheSync = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = bundleKeys.detail(bunchId, bundleId);
  return {
    onSuccess: (bundle: BundleDetail) => queryClient.setQueryData(key, bundle),
    onError: (error: unknown) => {
      if (readVersionConflict(error) !== undefined) {
        return queryClient.invalidateQueries({ queryKey: key });
      }
      return undefined;
    },
  };
};

type FieldInput<T> = { value: T; expectedVersion: number; mode: 'DRAFT' | 'PUBLISHED' };

const requireIds = (bunchId: string | undefined, bundleId: string | undefined) => {
  if (!bunchId || !bundleId) throw new Error('bundle is not loaded');
  return { bunchId, bundleId };
};

export const useSaveTitleMutation = (bunchId: string | undefined, bundleId: string | undefined) =>
  useMutation({
    mutationFn: (input: FieldInput<string> & { leaseToken?: string }) =>
      saveBundleTitle({ ...requireIds(bunchId, bundleId), ...input }),
    ...useBundleCacheSync(bunchId, bundleId),
  });

export const useSaveVisibilityMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) =>
  useMutation({
    mutationFn: (input: FieldInput<'PUBLIC' | 'PRIVATE'>) =>
      saveBundleVisibility({ ...requireIds(bunchId, bundleId), ...input }),
    ...useBundleCacheSync(bunchId, bundleId),
  });

export const useSaveDateMutation = (bunchId: string | undefined, bundleId: string | undefined) =>
  useMutation({
    mutationFn: (input: FieldInput<string | null> & { leaseToken?: string }) =>
      saveBundleDate({ ...requireIds(bunchId, bundleId), ...input }),
    ...useBundleCacheSync(bunchId, bundleId),
  });

export const useSaveCaptionMutation = (bunchId: string | undefined, bundleId: string | undefined) =>
  useMutation({
    mutationFn: (input: FieldInput<string> & { bundlePhotoId: string; leaseToken?: string }) =>
      saveBundleCaption({ ...requireIds(bunchId, bundleId), ...input }),
    ...useBundleCacheSync(bunchId, bundleId),
  });

export const useSaveCommentMutation = (bunchId: string | undefined, bundleId: string | undefined) =>
  useMutation({
    mutationFn: (input: FieldInput<string>) =>
      saveBundleComment({ ...requireIds(bunchId, bundleId), ...input }),
    ...useBundleCacheSync(bunchId, bundleId),
  });

export const useAddParticipantMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) =>
  useMutation({
    mutationFn: (memberId: string) => {
      const ids = requireIds(bunchId, bundleId);
      return addBundleParticipant(ids.bunchId, ids.bundleId, memberId);
    },
    ...useBundleCacheSync(bunchId, bundleId),
  });

export const useRemoveParticipantMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) =>
  useMutation({
    mutationFn: (memberId: string) => {
      const ids = requireIds(bunchId, bundleId);
      return removeBundleParticipant(ids.bunchId, ids.bundleId, memberId);
    },
    ...useBundleCacheSync(bunchId, bundleId),
  });

/**
 * 발행. 성공 응답으로 상세 캐시를 발행본으로 바꾸고, 충돌(BUNDLE_003)이면 최신 상세를 다시 받음
 * 번치 홈의 발행 번들 목록·개수 무효화는 번치 홈 연동 이슈에서 이 mutation에 묶음
 */
export const usePublishBundleMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) =>
  useMutation({
    mutationFn: (expectedRevision: number) => {
      const ids = requireIds(bunchId, bundleId);
      return publishBundle(ids.bunchId, ids.bundleId, expectedRevision, createIdempotencyKey());
    },
    ...useBundleCacheSync(bunchId, bundleId),
  });
