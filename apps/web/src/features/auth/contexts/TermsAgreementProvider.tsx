'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { TERMS_ITEMS, type TermsId } from '../constants/terms';
import { TermsAgreementContext } from './termsAgreementContext';

const withAll = (value: boolean) =>
  Object.fromEntries(TERMS_ITEMS.map(({ id }) => [id, value])) as Record<TermsId, boolean>;

/** 약관 체크 상태 임시 보관(signup layout 소유, 새로고침 시 초기화) */
export function TermsAgreementProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** 테스트용 초기값 */
  initial?: Partial<Record<TermsId, boolean>>;
}) {
  const [agreed, setAgreedState] = useState<Record<TermsId, boolean>>({
    ...withAll(false),
    ...initial,
  });

  const setAgreed = useCallback((id: TermsId, value: boolean) => {
    setAgreedState((previous) => ({ ...previous, [id]: value }));
  }, []);

  const setAllAgreed = useCallback((value: boolean) => {
    setAgreedState(withAll(value));
  }, []);

  const allAgreed = TERMS_ITEMS.every(({ id }) => agreed[id]);

  return (
    <TermsAgreementContext value={{ agreed, allAgreed, setAgreed, setAllAgreed }}>
      {children}
    </TermsAgreementContext>
  );
}
