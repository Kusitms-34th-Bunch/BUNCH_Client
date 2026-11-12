import { z } from 'zod';
import { bffApi, requestData } from './bffApi';

const availabilitySchema = z.object({ normalizedValue: z.string(), available: z.boolean() });

/** 닉네임을 지금 쓸 수 있는지(`GET /members/nickname-availability`). 이름을 예약하지 않으므로 저장 때 서버가 다시 확인함 */
export const checkNicknameAvailability = async (nickname: string, signal?: AbortSignal) => {
  const { available } = await requestData(
    bffApi.get('members/nickname-availability', {
      searchParams: { nickname },
      signal: signal ?? null,
    }),
    availabilitySchema,
    'nickname availability',
  );
  return available;
};
