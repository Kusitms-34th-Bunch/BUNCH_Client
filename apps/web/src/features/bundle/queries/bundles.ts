import {
  queryOptions,
  replaceEqualDeep,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { sharedKeys } from '@/shared/query/keys';
import {
  addBundleParticipant,
  changeBundlePhotos,
  createBundle,
  deleteBundle,
  getBundle,
  leaveBundle,
  moveBundlePhoto,
  publishBundle,
  readVersionConflict,
  removeBundleParticipant,
  saveBundleComment,
  mergeBundleTitle,
  saveBundleDate,
  saveBundleVisibility,
} from '../api/bundles';
import { type BundleDetail, type BundleTitleState, titleEventSchema } from '../model/bundle';
import { bundleKeys } from './keys';

/** 번들(초안·발행본) 상세. 번치나 번들을 아직 모르면 요청하지 않음(skipToken) */
export const bundleQueryOptions = (bunchId: string | undefined, bundleId: string | undefined) =>
  queryOptions({
    queryKey: bundleKeys.detail(bunchId, bundleId),
    queryFn: bunchId && bundleId ? ({ signal }) => getBundle(bunchId, bundleId, signal) : skipToken,
    // 먼저 보낸 재조회 응답이 그사이 저장 응답으로 맞춘 더 새 상태를 낡은 revision으로 덮지 않음(setQueryData에도 적용됨)
    // 같거나 더 새 revision이면 응답을 쓰되, 바뀌지 않은 부분은 기본 구조 공유로 참조를 유지해 불필요한 리렌더를 막음
    structuralSharing: (old, next) => {
      const previous = old as BundleDetail | undefined;
      const incoming = next as BundleDetail;
      if (!previous) return incoming;
      if (previous.revision > incoming.revision) return previous;
      // 제목 병합 응답은 revision을 바꾸지 않아, 같은 revision의 낡은 상세가 더 높은 제목 버전을 되돌리지 않게 함
      if (previous.titleCrdtState !== undefined && previous.titleVersion > incoming.titleVersion) {
        const kept = withTitleState(incoming, {
          title: previous.title,
          titleCrdtState: previous.titleCrdtState,
          titleVersion: previous.titleVersion,
          titleTooLong: previous.titleTooLong,
        });
        return replaceEqualDeep(previous, kept);
      }
      return replaceEqualDeep(previous, incoming);
    },
  });

/**
 * 초안 생성. 성공하면 응답으로 상세 캐시를 채워 이동 직후 바로 보여 줌
 * 실패 문구는 코드별(BUNDLE_001 등)로 달라 meta 없이 화면이 `mutate(…, { onError })`로 처리
 * 멱등 키를 주지 않으면 호출마다 새로 만듦(중복 요청은 화면이 막음)
 */
export const useCreateBundleMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      photoIds,
      participantMemberIds,
      idempotencyKey = createIdempotencyKey(),
    }: {
      photoIds: readonly string[];
      /** 나를 뺀 참여 멤버(1명 이상), 사진을 올린 멤버라도 고르지 않으면 참여하지 않음 */
      participantMemberIds: readonly string[];
      /** 응답이 유실된 뒤 다시 보내도 초안이 둘이 되지 않도록 호출하는 쪽이 같은 키를 유지 */
      idempotencyKey?: string;
    }) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return createBundle(bunchId, photoIds, idempotencyKey, participantMemberIds);
    },
    onSuccess: (bundle) => {
      queryClient.setQueryData(bundleKeys.detail(bundle.bunchId, bundle.id), bundle);
      // 번치 홈의 작성 중인 번들·개수가 새 초안을 포함하게 화면에 없어도 바로 다시 받되, 작성 화면 이동은 재조회를 기다리지 않음
      void queryClient.invalidateQueries({
        queryKey: sharedKeys.bunchHomeScope(bundle.bunchId),
        refetchType: 'all',
      });
    },
  });
};

// 번들이 사라지는 동작(삭제·나가기) 뒤: 번치 홈 데이터를 바로 다시 받고, 상세 캐시는 화면이 없을 때만 비움
// (나가기는 작성 화면이 이동 전까지 떠 있어, 지우면 그 화면이 비어 있는 상세를 다시 받아 「삭제된 번들」 안내가 겹칠 수 있음)
const useBundleGone = (
  bunchId: string | undefined,
  { removeDetail }: { removeDetail: boolean },
) => {
  const queryClient = useQueryClient();
  return async (bundleId: string) => {
    if (removeDetail) queryClient.removeQueries({ queryKey: bundleKeys.detail(bunchId, bundleId) });
    await queryClient.invalidateQueries({
      queryKey: sharedKeys.bunchHomeScope(bunchId),
      refetchType: 'all',
    });
  };
};

/** 번들 삭제(생성자·번치 관리자, 번치 홈 「작성 중인 번들」의 삭제 버튼) */
export const useDeleteBundleMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  const gone = useBundleGone(bunchId, { removeDetail: true });
  return useMutation({
    mutationFn: (bundleId: string) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return deleteBundle(bunchId, bundleId);
    },
    onSuccess: (_data, bundleId) => gone(bundleId),
    // 이미 다른 멤버가 지웠거나 권한이 없어 실패해도 서버 기준 목록으로 맞춤(사라진 카드가 남아 같은 실패가 반복되지 않게)
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: sharedKeys.bunchHomeScope(bunchId),
        refetchType: 'all',
      }),
  });
};

/** 초안 나가기(작성 화면의 「나가기」). 생성자가 나가면 초안이 삭제됨 */
export const useLeaveBundleMutation = (bunchId: string | undefined) => {
  const gone = useBundleGone(bunchId, { removeDetail: false });
  return useMutation({
    mutationFn: (bundleId: string) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return leaveBundle(bunchId, bundleId);
    },
    onSuccess: (_data, bundleId) => gone(bundleId),
  });
};

/** 번들 상세를 최신으로 다시 받음(실시간 연결이 끊겼다 돌아왔을 때처럼 놓친 변경을 맞출 때). 받지 못하면 reject */
export const useRefetchBundleDetail = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.refetchQueries(
      { queryKey: bundleKeys.detail(bunchId, bundleId), exact: true },
      { throwOnError: true },
    );
};

// 저장·참여자 변경 성공 응답(전체 BundleSnapshot)으로 상세 캐시를 바로 갱신하고,
// 버전 충돌이면 서버의 최신 상세를 다시 받아 화면이 최신 버전으로 이어서 저장하게 함
const useBundleCacheSync = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = bundleKeys.detail(bunchId, bundleId);
  return {
    // 응답이 뒤바뀌어 도착해도 더 최신 revision을 낡은 응답으로 덮지 않음
    onSuccess: (bundle: BundleDetail) =>
      queryClient.setQueryData<BundleDetail>(key, (old) =>
        old && old.revision > bundle.revision ? old : bundle,
      ),
    onError: (error: unknown) => {
      // 충돌 응답의 detail 모양과 상관없이 버전·상태 불일치(BUNDLE_003·BUNDLE_002)와 발행 거절(BUNDLE_005, 그 사이 다른 멤버가 바꿨을 수 있음)은 최신 상세를 다시 받음
      const code = (error as { code?: string } | null)?.code;
      if (
        readVersionConflict(error) !== undefined ||
        code === 'BUNDLE_003' ||
        code === 'BUNDLE_002' ||
        code === 'BUNDLE_005'
      ) {
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

/** 병합된 제목 상태(응답·이벤트)를 상세에 반영: 더 낡은 제목 버전으로 덮지 않고, 길이 초과 발행 사유도 맞춤 */
const withTitleState = (
  detail: BundleDetail,
  state: BundleTitleState,
  revision?: number,
): BundleDetail => {
  // 더 낡은 제목은 반영하지 않지만, 이벤트로 알게 된 revision은 맞춤(이후 이벤트가 건너뛴 것으로 보이지 않게)
  if (state.titleVersion < detail.titleVersion) {
    return revision === undefined
      ? detail
      : { ...detail, revision: Math.max(detail.revision, revision) };
  }
  const blockers = detail.publishBlockers.filter((reason) => reason !== 'TITLE_TOO_LONG');
  return {
    ...detail,
    title: state.title,
    titleVersion: state.titleVersion,
    titleCrdtState: state.titleCrdtState,
    titleTooLong: state.titleTooLong,
    publishBlockers: state.titleTooLong ? [...blockers, 'TITLE_TOO_LONG'] : blockers,
    revision: revision === undefined ? detail.revision : Math.max(detail.revision, revision),
  };
};

/**
 * 제목 CRDT 저장: 서버가 병합한 제목 상태로 상세 캐시를 갱신하고 갱신된 상세를 돌려줌
 * 응답에는 번들 revision이 없어 revision은 이후 TITLE 이벤트나 다음 상세 조회로 맞춰짐
 */
export const useMergeTitleMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) => {
  const queryClient = useQueryClient();
  const key = bundleKeys.detail(bunchId, bundleId);
  return useMutation({
    mutationFn: async (state: string): Promise<BundleDetail> => {
      const saved = await mergeBundleTitle({
        ...requireIds(bunchId, bundleId),
        state,
        requestId: createIdempotencyKey(),
      });
      const next = queryClient.setQueryData<BundleDetail>(key, (old) =>
        old ? withTitleState(old, saved) : old,
      );
      if (!next) throw new Error('bundle detail is not loaded');
      return next;
    },
  });
};

/**
 * 번들 topic으로 온 이벤트를 상세 캐시에 반영(지금은 TITLE만): revision이 이미 반영됐으면 무시, 바로 다음이면 적용,
 * 건너뛰었으면 놓친 이벤트가 있다는 뜻이라 최신 상세를 다시 받음(이벤트는 재생되지 않음). 같은 이벤트가 다시 와도 결과가 같음
 */
export const useApplyBundleEvent = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = bundleKeys.detail(bunchId, bundleId);
  return (body: unknown) => {
    const parsed = titleEventSchema.safeParse(body);
    if (!parsed.success) return;
    const event = parsed.data;
    const current = queryClient.getQueryData<BundleDetail>(key);
    if (!current || current.status !== 'DRAFT' || event.revision <= current.revision) return;
    if (event.revision === current.revision + 1) {
      queryClient.setQueryData<BundleDetail>(
        key,
        withTitleState(current, event.data, event.revision),
      );
    } else {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
};

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
    mutationFn: (input: FieldInput<string | null>) =>
      saveBundleDate({ ...requireIds(bunchId, bundleId), ...input }),
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

type PhotoChangeInput = Omit<Parameters<typeof changeBundlePhotos>[0], 'bunchId' | 'bundleId'>;
type PhotoMoveInput = Omit<Parameters<typeof moveBundlePhoto>[0], 'bunchId' | 'bundleId'>;

// 사진 구성은 실패한 이유와 상관없이(anchor 충돌 등) 최신 상세를 다시 받아 화면을 서버에 맞춤
const usePhotoCacheSync = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  const sync = useBundleCacheSync(bunchId, bundleId);
  return {
    onSuccess: sync.onSuccess,
    onError: () =>
      queryClient.invalidateQueries({ queryKey: bundleKeys.detail(bunchId, bundleId) }),
  };
};

/** 사진 구성 변경(추가·제거). 성공 응답으로 상세 캐시를 바로 갱신 */
export const useChangePhotosMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) =>
  useMutation({
    mutationFn: (input: PhotoChangeInput) => {
      const ids = requireIds(bunchId, bundleId);
      return changeBundlePhotos({ ...ids, ...input });
    },
    ...usePhotoCacheSync(bunchId, bundleId),
  });

/** 사진 순서 이동 */
export const useMovePhotoMutation = (bunchId: string | undefined, bundleId: string | undefined) =>
  useMutation({
    mutationFn: (input: PhotoMoveInput) => {
      const ids = requireIds(bunchId, bundleId);
      return moveBundlePhoto({ ...ids, ...input });
    },
    ...usePhotoCacheSync(bunchId, bundleId),
  });

/**
 * 발행. 성공 응답으로 상세 캐시를 발행본으로 바꾸고 번치 홈 데이터 전체(프로필 개수·완성된 번들)를 무효화해 새 번들이 앞에 쌓이게 함
 * 충돌(BUNDLE_003)이면 최신 상세를 다시 받음
 */
export const usePublishBundleMutation = (
  bunchId: string | undefined,
  bundleId: string | undefined,
) => {
  const queryClient = useQueryClient();
  const sync = useBundleCacheSync(bunchId, bundleId);
  return useMutation({
    mutationFn: ({
      idempotencyKey = createIdempotencyKey(),
      ...input
    }: {
      visibility: 'PUBLIC' | 'PRIVATE';
      expectedRevision: number;
      /** 응답이 유실된 뒤 다시 보내도 한 번만 발행되도록 호출하는 쪽이 같은 키를 유지 */
      idempotencyKey?: string;
    }) => {
      const ids = requireIds(bunchId, bundleId);
      return publishBundle(ids.bunchId, ids.bundleId, input, idempotencyKey);
    },
    onError: sync.onError,
    onSuccess: async (bundle: BundleDetail) => {
      sync.onSuccess(bundle);
      // 반환해서 mutateAsync가 번치 홈 재요청 시작까지 이어지게 함
      // 번치 홈이 화면에 없어도 바로 다시 받아, 홈으로 돌아왔을 때 옛 목록이 먼저 보이지 않게 함
      await queryClient.invalidateQueries({
        queryKey: sharedKeys.bunchHomeScope(bunchId),
        refetchType: 'all',
      });
    },
  });
};
