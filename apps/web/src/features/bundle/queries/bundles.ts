import {
  queryOptions,
  replaceEqualDeep,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { PROHIBITED_WORD_CODE } from '@/shared/api/prohibitedWord';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { sharedKeys } from '@/shared/query/keys';
import {
  addBundleParticipant,
  changeBundlePhotos,
  createBundle,
  deleteBundle,
  getBundle,
  getDraftBundleCount,
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
import {
  applyContentEvent,
  applyDateChips,
  type BundleEventOutcome,
  keepNewerLocations,
  keepNewerPicks,
  titleProhibitedOf,
  withTitleState,
} from '../lib/bundleEvents';
import { type BundleDetail, bundleEventEnvelopeSchema, CONTENT_EVENT_TYPES } from '../model/bundle';
import { bundleKeys, bundleMutationKeys } from './keys';

/** revision 검사 없이 항상 최신 상세로 확인하는 상태 전환 이벤트 */
const STATE_CHANGE_EVENT_TYPES: readonly string[] = [
  'PERMISSIONS',
  'DELETED',
  'CREATED',
  'PUBLISHED',
  'EDITED',
];

/** 번들(초안·발행본) 상세. 번치나 번들을 아직 모르면 요청하지 않음(skipToken) */
export const bundleQueryOptions = (bunchId: string | undefined, bundleId: string | undefined) =>
  queryOptions({
    queryKey: bundleKeys.detail(bunchId, bundleId),
    queryFn: bunchId && bundleId ? ({ signal }) => getBundle(bunchId, bundleId, signal) : skipToken,
    // 먼저 보낸 재조회 응답이 그사이 이벤트로 맞춘 더 새 상태를 낡은 revision으로 덮지 않음(setQueryData에도 적용됨)
    // 같거나 더 새 revision이면 응답을 쓰되, 바뀌지 않은 부분은 기본 구조 공유로 참조를 유지해 불필요한 리렌더를 막음
    structuralSharing: (old, next) => {
      const previous = old as BundleDetail | undefined;
      const incoming = next as BundleDetail;
      if (!previous) return incoming;
      if (previous.revision > incoming.revision) return previous;
      // 픽 저장 응답도 revision을 바꾸지 않아, 같은 revision의 낡은 상세가 방금 저장한 픽을 되돌리지 않게 함
      const current = keepNewerLocations(previous, keepNewerPicks(previous, incoming));
      // 제목 병합 응답은 revision을 바꾸지 않아, 같은 revision의 낡은 상세가 더 높은 제목 버전을 되돌리지 않게 함
      if (previous.titleCrdtState !== undefined && previous.titleVersion > current.titleVersion) {
        const kept = withTitleState(current, {
          title: previous.title,
          titleCrdtState: previous.titleCrdtState,
          titleVersion: previous.titleVersion,
          titleTooLong: previous.titleTooLong,
          // 제목 금칙어 여부와 제목 계열 발행 차단 사유도 지킨 제목(더 높은 버전)의 값으로 둠
          titleProhibited: previous.profanity?.titleProhibited,
          publishBlockers: previous.publishBlockers,
        });
        return replaceEqualDeep(previous, kept);
      }
      return replaceEqualDeep(previous, current);
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
      recommendationId,
      idempotencyKey = createIdempotencyKey(),
    }: {
      photoIds: readonly string[];
      /** 나를 뺀 참여 멤버(1명 이상), 사진을 올린 멤버라도 고르지 않으면 참여하지 않음 */
      participantMemberIds: readonly string[];
      /** 마지막으로 적용한 추천 번들 id */
      recommendationId?: string | undefined;
      /** 응답이 유실된 뒤 다시 보내도 초안이 둘이 되지 않도록 호출하는 쪽이 같은 키를 유지 */
      idempotencyKey?: string;
    }) => {
      if (!bunchId) return Promise.reject(new Error('bunch is not loaded'));
      return createBundle(
        bunchId,
        photoIds,
        idempotencyKey,
        participantMemberIds,
        recommendationId,
      );
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
    mutationKey: bundleMutationKeys.leave,
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
        code === 'BUNDLE_005' ||
        // 저장·발행에서 금칙어로 거부(발행 때 다시 검사): 그사이 바뀐 제목·코멘트의 검사 상태를 받아 안내를 보임
        code === PROHIBITED_WORD_CODE
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
        old
          ? withTitleState(old, { ...saved, titleProhibited: titleProhibitedOf(saved.profanity) })
          : old,
      );
      if (!next) throw new Error('bundle detail is not loaded');
      return next;
    },
  });
};

/**
 * 번들 topic으로 온 이벤트를 상세 캐시에 반영(v5 실시간 명세 6절)
 * - 내용 이벤트(revision 있음): 이미 반영된 revision은 무시, 바로 다음이면 type별 data를 적용, 건너뛰었으면 놓친 이벤트가 있다는 뜻이라 최신 상세를 다시 받음(이벤트는 재생되지 않음)
 * - PERMISSIONS·DELETED·CREATED·PUBLISHED·EDITED: revision 검사 없이 항상 상세를 다시 받아 확인(발행·삭제·참여 제외 화면은 그 결과로 정해짐)
 * - DATE_CHIPS: 내용 revision을 올리지 않는 별도 갱신이라 revision 검사를 하지 않음. PRESENCE 등 그 밖의 type은 건드리지 않음
 * 같은 이벤트가 다시 와도 결과가 같음
 */
export const useApplyBundleEvent = (bunchId: string | undefined, bundleId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = bundleKeys.detail(bunchId, bundleId);
  const refetch = () => void queryClient.invalidateQueries({ queryKey: key });
  const settle = (outcome: BundleEventOutcome) => {
    if (outcome.kind === 'apply') queryClient.setQueryData<BundleDetail>(key, outcome.detail);
    else if (outcome.kind === 'refetch') refetch();
  };
  return (body: unknown) => {
    const envelope = bundleEventEnvelopeSchema.safeParse(body);
    if (!envelope.success) return;
    const { type, revision, data } = envelope.data;
    const current = queryClient.getQueryData<BundleDetail>(key);

    // 권한·삭제·발행 같은 상태 전환은 revision과 상관없이 확인해야 하므로 중복 제거 없이 항상 다시 받음
    // 방송 data의 권한은 요청한 사람마다 달라 쓰지 않음
    if (STATE_CHANGE_EVENT_TYPES.includes(type)) {
      if (current) refetch();
      return;
    }
    if (type === 'DATE_CHIPS') {
      if (current && current.status === 'DRAFT') settle(applyDateChips(current, data));
      return;
    }
    if (!(CONTENT_EVENT_TYPES as readonly string[]).includes(type) || revision == null) return;
    if (!current || current.status !== 'DRAFT' || revision <= current.revision) return;
    if (revision > current.revision + 1) {
      refetch();
      return;
    }
    settle(applyContentEvent(current, type, data, revision));
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

/** 번치 멤버 목록을 서버에서 새로 받음(그사이 멤버가 나갔는지 확인할 때) */
export const useFetchLatestBunchMembers = () => {
  const queryClient = useQueryClient();
  return (bunchId: string | undefined) =>
    queryClient.fetchQuery({ ...bunchMembersQueryOptions(bunchId), staleTime: 0 });
};

/**
 * 번들 만들기 진입 확인(기능명세 4.1.1)에 쓰는 최신 값: 번치 멤버(새로 받음)와 작성 중인 번들 수
 * 하나가 실패해도 다른 값으로 판단하도록 각각의 결과를 돌려줌
 */
export const useFetchBundleEntryState = () => {
  const fetchMembers = useFetchLatestBunchMembers();
  return (bunchId: string) =>
    Promise.allSettled([fetchMembers(bunchId), getDraftBundleCount(bunchId)] as const);
};

/** 번들 상세를 서버에서 새로 받음(번치 홈 「작성 중인 번들」을 열거나 지우기 전 삭제·발행 여부 확인, 기능명세 5.3.1·5.3.2) */
export const useFetchLatestBundle = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return (bundleId: string) =>
    queryClient.fetchQuery({ ...bundleQueryOptions(bunchId, bundleId), staleTime: 0 });
};
