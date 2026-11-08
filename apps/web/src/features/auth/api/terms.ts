import { normalizeError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { TERMS_ITEMS, type ServerTermType } from '../constants/terms';

const SERVER_TERM_TYPES = ['SERVICE', 'PRIVACY', 'AGE_OVER_14', 'DEMOGRAPHICS'] as const;

/** `GET /api/v1/auth/terms` 응답(Swagger에 응답 타입이 없어 명세서 기준). 약관 원문은 앱이 갖고 서버는 종류·버전만 줌 */
const termsSchema = z.object({
  terms: z.array(
    z.object({
      type: z.enum(SERVER_TERM_TYPES),
      version: z.string().min(1),
      required: z.boolean(),
    }),
  ),
});

type TermVersions = Partial<Record<ServerTermType, string>>;

/** 현재 적용되는 약관별 버전 */
export const getTermVersions = async (signal?: AbortSignal): Promise<TermVersions> => {
  const { terms } = await requestData(
    bffApi.get('auth/terms', { signal: signal ?? null }),
    termsSchema,
    'terms',
  );
  return Object.fromEntries(terms.map(({ type, version }) => [type, version]));
};

/**
 * 약관 동의 저장: 현재 버전을 읽어 필수 3종과(동의했으면) 선택 약관을 한 번에 보냄
 * 선택 약관은 동의했을 때만 보냄(서버가 동의 안 함을 따로 받는지 명세에 없음). 서버가 선택 약관 버전을 주지 않으면 보내지 않음
 * 같은 버전의 재시도는 서버가 이력을 중복 생성하지 않음. 실패는 `ApiError`로 던짐
 */
export const saveTermsAgreements = async ({ demographics }: { demographics: boolean }) => {
  try {
    const versions = await getTermVersions();
    const agreements = TERMS_ITEMS.filter(({ required }) => required || demographics).flatMap(
      ({ serverType }) => {
        const version = versions[serverType];
        // 필수 약관 버전이 없으면 저장할 수 없음(서버 설정 미준비)
        if (!version) {
          if (serverType === 'DEMOGRAPHICS') return [];
          throw new Error(`약관 버전을 받지 못했습니다: ${serverType}`);
        }
        return [{ type: serverType, version, agreed: true }];
      },
    );
    await bffApi.post('auth/terms/agreements', { json: { agreements } });
  } catch (error) {
    throw normalizeError(error);
  }
};
