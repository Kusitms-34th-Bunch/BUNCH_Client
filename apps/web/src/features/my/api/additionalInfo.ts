import type { components } from '@app/api-core/generated';
import { type ApiContract, normalizeError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { getTermVersions, type TermVersions } from '@/shared/api/termVersions';
import { fromServerGender } from '@/shared/lib/profile/gender';
import type { AdditionalInfo } from '../lib/types';

/** `GET /members/me/additional-info`·`PUT /members/me/additional-info-consent` 응답 */
const additionalInfoSchema = z.object({
  consented: z.boolean(),
  birthYear: z.number().int().nullish(),
  gender: z.enum(['FEMALE', 'MALE']).nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['AdditionalInfoResponse']>>;

const toAdditionalInfo = ({
  consented,
  birthYear,
  gender,
}: z.infer<typeof additionalInfoSchema>): AdditionalInfo => ({
  consented,
  // 동의하지 않았으면 서버가 값을 지운 상태(기능명세서 7.4.5 로직 2). 남아 와도 화면에 쓰지 않게 버림
  birthYear: consented ? (birthYear ?? undefined) : undefined,
  gender: consented && gender ? fromServerGender(gender) : undefined,
});

/** 추가 개인정보(출생연도·성별) 수집·이용 동의 여부와 저장된 출생연도·성별 */
export const getAdditionalInfo = async (signal?: AbortSignal) =>
  toAdditionalInfo(
    await requestData(
      bffApi.get('members/me/additional-info', { signal: signal ?? null }),
      additionalInfoSchema,
      'additional info',
    ),
  );

/**
 * 추가 개인정보 수집·이용 동의·철회. 동의서 현재 버전(`GET /auth/terms`의 DEMOGRAPHICS)을 함께 보내 이력으로 남김(기능명세서 7.4.5 로직 1)
 * 서버가 버전을 주지 않으면 버전 없이 보냄(요청 계약에서 선택). 버전 조회가 실패하면 동의는 보내지 않고 실패로 던지고(버전 없는 동의 이력 방지),
 * 철회만 버전 없이 보냄(약관 조회 장애로 철회가 막히지 않게). 철회하면 서버가 출생연도·성별을 지움
 * 실패는 `ApiError`로 던짐
 */
export const updateAdditionalInfoConsent = async (agreed: boolean) => {
  try {
    const versions: TermVersions = agreed
      ? await getTermVersions()
      : await getTermVersions().catch(() => ({}));
    const version = versions.DEMOGRAPHICS;
    const json = {
      agreed,
      ...(version ? { version } : {}),
    } satisfies components['schemas']['AdditionalInfoConsentRequest'];
    return toAdditionalInfo(
      await requestData(
        bffApi.put('members/me/additional-info-consent', { json }),
        additionalInfoSchema,
        'additional info consent',
      ),
    );
  } catch (error) {
    throw normalizeError(error);
  }
};
