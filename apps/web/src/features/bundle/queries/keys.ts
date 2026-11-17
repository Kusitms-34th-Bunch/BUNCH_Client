// 응답을 바꾸는 입력은 모두 key에 포함(docs/architecture/data-layer.md)
export const bundleKeys = {
  all: ['bundle'] as const,
  // 번치를 아직 모르면 undefined(요청하지 않는 skipToken 상태의 key)
  detail: (bunchId: string | undefined, bundleId: string | undefined) =>
    [...bundleKeys.all, 'detail', bunchId, bundleId] as const,
  // 그 번치의 번들 상세 전체(사진이 지워져 여러 초안이 바뀔 수 있을 때)
  detailsOf: (bunchId: string | undefined) => [...bundleKeys.all, 'detail', bunchId] as const,
  recommendations: (bunchId: string | undefined) =>
    [...bundleKeys.all, 'recommendations', bunchId] as const,
  recommendation: (bunchId: string | undefined, id: string | undefined) =>
    [...bundleKeys.all, 'recommendation', bunchId, id] as const,
};

// 진행 중인 변경을 화면 밖에서 구분할 때 쓰는 mutation key
export const bundleMutationKeys = {
  /** 초안 나가기(본인이 나가는 동안 참여 제외 안내를 띄우지 않기 위함) */
  leave: [...bundleKeys.all, 'leave'] as const,
};
