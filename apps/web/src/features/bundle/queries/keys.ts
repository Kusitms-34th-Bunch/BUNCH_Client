// 응답을 바꾸는 입력은 모두 key에 포함(docs/architecture/data-layer.md)
export const bundleKeys = {
  all: ['bundle'] as const,
  // 번치를 아직 모르면 undefined(요청하지 않는 skipToken 상태의 key)
  detail: (bunchId: string | undefined, bundleId: string | undefined) =>
    [...bundleKeys.all, 'detail', bunchId, bundleId] as const,
};
