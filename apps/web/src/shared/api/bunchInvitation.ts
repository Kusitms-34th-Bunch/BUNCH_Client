import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from './client/bffApi';

/** `POST /bunches/{id}/invitations` 응답 */
const invitationSchema = z.object({
  url: z.string().min(1),
  code: z.string(),
  expiresAt: z.string(),
}) satisfies z.ZodType<ApiContract<components['schemas']['InvitationResponse']>>;

export type BunchInvitation = { url: string; expiresAt: string };

/**
 * 번치의 유효한 초대 링크(번치당 1개, 7일 유효). 있으면 그 링크를, 없거나 만료·폐기됐으면 새로 발급해 돌려줌
 * 링크 하나를 여러 번 불러도 같은 링크라 다시 불러오기에 써도 안전함
 */
export const issueBunchInvitation = async (
  bunchId: string,
  signal?: AbortSignal,
): Promise<BunchInvitation> => {
  const { url, expiresAt } = await requestData(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/invitations`, { signal: signal ?? null }),
    invitationSchema,
    'issue bunch invitation',
  );
  return { url, expiresAt };
};
