import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import type { PushPreferencePatch, PushPreferences } from '../lib/notificationPreferences';

const pushPreferencesSchema = z.object({
  enabled: z.boolean(),
  categories: z.record(z.string(), z.boolean()),
}) satisfies z.ZodType<ApiContract<components['schemas']['PushPreferenceResponse']>>;

// 서버 필드 이름은 `categories`, 화면 계층은 알림 종류라는 뜻으로 `types`를 씀(이름 변환은 이 파일에서만)
const toPushPreferences = ({
  enabled,
  categories,
}: z.infer<typeof pushPreferencesSchema>): PushPreferences => ({ enabled, types: categories });

/** 내 푸시 수신 설정 조회(`GET /api/v1/members/me/push-preferences`): 계정 전체 수신과 알림 종류별 수신 */
export const getPushPreferences = async (signal?: AbortSignal): Promise<PushPreferences> =>
  toPushPreferences(
    await requestData(
      bffApi.get('members/me/push-preferences', { signal: signal ?? null }),
      pushPreferencesSchema,
      'push preferences',
    ),
  );

/**
 * 내 푸시 수신 설정 부분 수정(`PATCH /api/v1/members/me/push-preferences`): 보낸 값만 바꾸고 바뀐 전체 설정을 돌려줌
 * 별도 버전·멱등 키가 없고, 알 수 없는 알림 종류나 불리언이 아닌 값은 서버가 400으로 거절함
 */
export const updatePushPreferences = async (patch: PushPreferencePatch): Promise<PushPreferences> =>
  toPushPreferences(
    await requestData(
      bffApi.patch('members/me/push-preferences', {
        json: {
          ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
          ...(patch.types === undefined ? {} : { categories: patch.types }),
        } satisfies components['schemas']['PushPreferencePatchRequest'],
      }),
      pushPreferencesSchema,
      'push preferences update',
    ),
  );
