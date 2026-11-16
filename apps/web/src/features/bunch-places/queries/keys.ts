// 응답을 바꾸는 입력은 모두 key에 포함(docs/architecture/data-layer.md)
// 서버가 지금 번치의 콕을 주므로 번치를 key에 둠(번치를 바꾸면 다른 목록)
export const bunchPlacesKeys = {
  all: ['bunch-places'] as const,
  lists: (bunchId: string) => [...bunchPlacesKeys.all, 'list', bunchId] as const,
  list: (bunchId: string, memberId: string) =>
    [...bunchPlacesKeys.lists(bunchId), memberId] as const,
};
