import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { pushDeviceRegistrationSchema, type PushDeviceRegistration } from '@app/bridge';
import { z } from 'zod';
import { bffApi, requestData } from './bffApi';

const pushDeviceSchema = z.object({
  installationId: z.uuid(),
  environment: z.enum(['SANDBOX', 'PRODUCTION']),
  authorizationStatus: z.enum(['NOT_DETERMINED', 'DENIED', 'AUTHORIZED', 'PROVISIONAL']),
  registeredAt: z.string(),
}) satisfies z.ZodType<ApiContract<components['schemas']['PushDeviceResponse']>>;

// 데이터 없는 성공 응답(Swagger `ApiResponseUnit`)은 data가 빠지거나 null
const unitSchema = z.null().optional();

// 경로에 들어가는 설치 ID는 UUID만 허용(쉘이 준 값을 그대로 경로에 붙이지 않음)
const devicePath = (installationId: string) =>
  `members/me/push-devices/${encodeURIComponent(z.uuid().parse(installationId))}`;

/**
 * 이 기기의 푸시 토큰을 현재 로그인 세션에 등록·갱신(`PUT /api/v1/members/me/push-devices/{installationId}`)
 * 같은 바인딩의 재등록은 서버가 멱등으로 처리하고, 계정·세션이 바뀌면 이전 바인딩을 해제함. 토큰은 응답에 돌아오지 않음
 * 토큰은 로그·오류에 넣지 않으며(요청 본문은 오류에 담기지 않음) 호출한 쪽도 저장하지 않음
 */
export const registerPushDevice = (registration: PushDeviceRegistration) => {
  // 쉘이 준 값이 계약에 맞는지 다시 확인한 뒤 보냄
  const { installationId, deviceToken, environment, authorizationStatus } =
    pushDeviceRegistrationSchema.parse(registration);
  return requestData(
    bffApi.put(devicePath(installationId), {
      json: { deviceToken, environment, authorizationStatus },
    }),
    pushDeviceSchema,
    'push device',
  );
};

/** 이 기기를 현재 로그인 세션에서 해제(`DELETE /api/v1/members/me/push-devices/{installationId}`). 이미 해제됐거나 바인딩이 없으면 서버가 멱등 성공으로 처리 */
export const unregisterPushDevice = async (installationId: string) => {
  await requestData(
    bffApi.delete(devicePath(installationId)),
    unitSchema,
    'push device unregister',
  );
};
