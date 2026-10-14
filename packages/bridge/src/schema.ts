import { z } from 'zod';

/**
 * share: 번치 프로필·번들 URL을 네이티브 공유 시트로 공유한다.
 * 첫 bridge 메서드 예시다. 새 메서드를 추가하면 이 파일에 schema를, index.ts의
 * AppBridge에 메서드 시그니처를 함께 추가한다.
 */
export const shareParamsSchema = z.object({
  url: z.url(),
  title: z.string().optional(),
});

export type ShareParams = z.infer<typeof shareParamsSchema>;
