'use client';

import { createContext, useContext } from 'react';
import type { TermsId } from '../constants/terms';

export type TermsAgreementValue = {
  agreed: Record<TermsId, boolean>;
  /** 모든 필수 약관 동의 여부(시작하기 활성 조건) */
  allAgreed: boolean;
  setAgreed: (_id: TermsId, _value: boolean) => void;
  /** 전체 동의·해제 */
  setAllAgreed: (_value: boolean) => void;
};

export const TermsAgreementContext = createContext<TermsAgreementValue | null>(null);

export function useTermsAgreement() {
  const agreement = useContext(TermsAgreementContext);
  if (!agreement) throw new Error('useTermsAgreement는 TermsAgreementProvider 안에서 써야 합니다.');
  return agreement;
}
