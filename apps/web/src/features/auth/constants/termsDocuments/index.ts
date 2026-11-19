import type { TermsDocumentId } from '../terms';
import type { TermsDocumentContent } from './types';
import { DEMOGRAPHICS_TERMS } from './demographics';
import { PRIVACY_CONSENT_TERMS } from './privacyConsent';
import { PRIVACY_POLICY_TERMS } from './privacyPolicy';
import { SERVICE_TERMS } from './service';

export type * from './types';

/** 약관 원문 1.0(2026. 11. 18 시행). 가입과 MY가 쓰는 문서는 각 route가 고름 */
export const TERMS_DOCUMENTS: Record<TermsDocumentId, TermsDocumentContent> = {
  service: SERVICE_TERMS,
  privacy: PRIVACY_CONSENT_TERMS,
  demographics: DEMOGRAPHICS_TERMS,
  privacyPolicy: PRIVACY_POLICY_TERMS,
};
