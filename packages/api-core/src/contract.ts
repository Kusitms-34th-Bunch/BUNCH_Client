// 선택 필드 키(값이 없어도 되는 필드)
type OptionalKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];

/**
 * zod 응답 스키마를 Swagger 생성 타입과 묶는 기준(`schema satisfies z.ZodType<ApiContract<생성 타입>>`), 최상위 선택 필드만 생략·null 허용
 * 스키마 결과가 계약에 들어맞는지만 보는 단방향 검사: 필수 필드 누락·값 타입·계약 밖 enum 값은 잡고, 추가 필드·좁은 enum·빠진 선택 필드는 못 잡음
 */
export type ApiContract<T> = Omit<T, OptionalKeys<T>> & {
  [K in OptionalKeys<T>]?: T[K] | null | undefined;
};
