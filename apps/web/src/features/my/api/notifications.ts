import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import type { PushPreferencePatch, PushPreferences } from '../lib/notificationPreferences';

const pushPreferencesSchema = z.object({
  enabled: z.boolean(),
  types: z.record(z.string(), z.boolean()),
}) satisfies z.ZodType<ApiContract<components['schemas']['PushPreferenceResponse']>>;

/** 내 푸시 수신 설정 조회(`GET /api/v1/members/me/push-preferences`): 계정 전체 수신과 알림 종류별 수신 */
export const getPushPreferences = (signal?: AbortSignal): Promise<PushPreferences> =>
  requestData(
    bffApi.get('members/me/push-preferences', { signal: signal ?? null }),
    pushPreferencesSchema,
    'push preferences',
  );

/**
 * 내 푸시 수신 설정 부분 수정(`PATCH /api/v1/members/me/push-preferences`): 보낸 값만 바꾸고 바뀐 전체 설정을 돌려줌
 * 별도 버전·멱등 키가 없고, 알 수 없는 알림 종류나 불리언이 아닌 값은 서버가 400으로 거절함
 */
export const updatePushPreferences = (patch: PushPreferencePatch): Promise<PushPreferences> =>
  requestData(
    bffApi.patch('members/me/push-preferences', { json: patch }),
    pushPreferencesSchema,
    'push preferences update',
  );
