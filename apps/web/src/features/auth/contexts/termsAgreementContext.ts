'use client';

import { createContext, useContext } from 'react';
import type { TermsId } from '../constants/terms';

export type TermsAgreementValue = {
  agreed: Record<TermsId, boolean>;
  /** 필수·선택 약관을 모두 동의했는지(전체 동의 체크 상태) */
  allAgreed: boolean;
  /** 필수 약관을 모두 동의했는지(시작하기 활성 조건) */
  requiredAgreed: boolean;
  setAgreed: (_id: TermsId, _value: boolean) => void;
  /** 전체 동의·해제(선택 약관 포함) */
  setAllAgreed: (_value: boolean) => void;
};

export const TermsAgreementContext = createContext<TermsAgreementValue | null>(null);

export function useTermsAgreement() {
  const agreement = useContext(TermsAgreementContext);
  if (!agreement) throw new Error('useTermsAgreement는 TermsAgreementProvider 안에서 써야 합니다.');
  return agreement;
}
