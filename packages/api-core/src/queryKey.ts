export const normalizeParams = <T extends Record<string, unknown>>(params: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

export const createQueryKeys = <Root extends string>(root: Root) => {
  const all = [root] as const;
  const lists = () => [...all, 'list'] as const;
  const details = () => [...all, 'detail'] as const;

  return {
    all,
    lists,
    list: <P extends Record<string, unknown>>(params?: P) =>
      params ? ([...lists(), normalizeParams(params)] as const) : lists(),
    details,
    detail: (id: string | number) => [...details(), id] as const,
  };
};
