import { normalizeError } from '@app/api-core';
import { bffApi } from '@/shared/api/bffApi';
import { getTermVersions } from '@/shared/api/termVersions';
import { TERMS_ITEMS } from '../constants/terms';

/**
 * 약관 동의 저장: 현재 버전을 읽어 필수 3종과(동의했으면) 선택 약관을 한 번에 보냄
 * 선택 약관은 동의했을 때만 보내고 동의하지 않으면 항목을 아예 보내지 않음(`agreed: false`로 보내지 않음, 백엔드 확인 2026-11-10). 서버가 선택 약관 버전을 주지 않으면 보내지 않음
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
