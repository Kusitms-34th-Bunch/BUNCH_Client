/**
 * 받은 값 없이 실패함(처음 받기 실패): 화면 전체 실패 안내를 보일 때
 * 다시 받는 중에도 실패로 봄. null을 값으로 받는 query는 「없음」과 구분되지 않아 타입에서 막음
 */
export const loadFailed = (query: { isError: boolean; data: NonNullable<unknown> | undefined }) =>
  query.isError && query.data === undefined;
