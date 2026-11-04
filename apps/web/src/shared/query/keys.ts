// 여러 feature가 함께 쓰는 query key(응답을 바꾸는 입력은 모두 key에 포함, docs/architecture/data-layer.md)
export const sharedKeys = {
  me: () => ['me'] as const,
  // 번치를 아직 모르면 undefined(요청하지 않는 skipToken 상태의 key)
  bunchMembers: (bunchId: string | undefined) => ['bunch-members', bunchId] as const,
};
