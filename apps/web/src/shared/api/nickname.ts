import { bffApi, requestData } from './client/bffApi';
import {
  nameAvailabilitySchema,
  type NameCheckResult,
  toNameCheckResult,
} from './nameAvailability';

/**
 * 닉네임을 지금 쓸 수 있는지(`GET /members/nickname-availability`): 사용 가능·사용 중·금칙어 포함
 * 이름을 예약하지 않으므로 저장 때 서버가 다시 확인함
 */
export const checkNicknameAvailability = async (
  nickname: string,
  signal?: AbortSignal,
): Promise<NameCheckResult> =>
  toNameCheckResult(
    await requestData(
      bffApi.get('members/nickname-availability', {
        searchParams: { nickname },
        signal: signal ?? null,
      }),
      nameAvailabilitySchema,
      'nickname availability',
    ),
  );
