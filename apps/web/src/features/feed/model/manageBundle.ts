import { z } from 'zod';

/**
 * 우리 번치 번들 조회·공개 범위 저장 응답(Swagger `BundleSnapshot`)에서 공개 범위 화면이 쓰는 값만
 * 외부 상세(084)와 달리 멤버 공개 번들도 오고, 저장에 필요한 공개 범위 버전이 있음
 */
export const managedBundleSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).nullish(),
  visibilityVersion: z.number().int().nonnegative(),
  permissions: z.object({ canEdit: z.boolean() }),
});
export type ManagedBundle = z.infer<typeof managedBundleSchema>;
