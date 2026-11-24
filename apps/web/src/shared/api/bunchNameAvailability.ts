import { bffApi, requestData } from './client/bffApi';
import {
  nameAvailabilitySchema,
  type NameCheckResult,
  toNameCheckResult,
} from './nameAvailability';

/**
 * 번치 이름을 지금 쓸 수 있는지(`GET /bunches/name-availability`, 번치 만들기·프로필 편집): 사용 가능·사용 중·금칙어 포함
 * 이름을 예약하지 않으므로 저장 때 서버가 다시 확인함(중복 `BUNCH_001`, 금칙어 `COMMON_003`)
 * `excludeBunchId`는 그 번치의 지금 이름을 사용 중으로 보지 않음(프로필 편집)
 */
export const checkBunchNameAvailability = async (
  name: string,
  { excludeBunchId, signal }: { excludeBunchId?: string; signal?: AbortSignal } = {},
): Promise<NameCheckResult> =>
  toNameCheckResult(
    await requestData(
      bffApi.get('bunches/name-availability', {
        searchParams: { name, ...(excludeBunchId ? { excludeBunchId } : {}) },
        signal: signal ?? null,
      }),
      nameAvailabilitySchema,
      'bunch name availability',
    ),
  );
