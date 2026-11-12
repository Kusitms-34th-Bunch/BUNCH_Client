import { z } from 'zod';
import { bffApi, requestData } from './bffApi';

/** 번치 이름 중복 확인 응답(`GET /bunches/name-availability`) */
const availabilitySchema = z.object({ normalizedValue: z.string(), available: z.boolean() });

/**
 * 번치 이름을 지금 쓸 수 있는지(번치 만들기·프로필 편집). 이름을 예약하지 않으므로 저장 때 서버가 다시 확인함(`BUNCH_001`)
 * `excludeBunchId`는 그 번치의 지금 이름을 사용 중으로 보지 않음(프로필 편집)
 */
export const checkBunchNameAvailability = async (
  name: string,
  { excludeBunchId, signal }: { excludeBunchId?: string; signal?: AbortSignal } = {},
) => {
  const { available } = await requestData(
    bffApi.get('bunches/name-availability', {
      searchParams: { name, ...(excludeBunchId ? { excludeBunchId } : {}) },
      signal: signal ?? null,
    }),
    availabilitySchema,
    'bunch name availability',
  );
  return available;
};
