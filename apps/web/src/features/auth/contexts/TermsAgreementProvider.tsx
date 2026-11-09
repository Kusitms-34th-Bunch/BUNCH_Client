'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { TERMS_ITEMS, type TermsId } from '../constants/terms';
import { TermsAgreementContext } from './termsAgreementContext';

const withAll = (value: boolean) =>
  Object.fromEntries(TERMS_ITEMS.map(({ id }) => [id, value])) as Record<TermsId, boolean>;

/**
 * 약관 체크 상태 임시 보관(signup layout 소유, 새로고침 시 초기화)
 * 선택 약관 동의 여부는 프로필 화면의 출생연도·성별 입력 노출 판단에도 사용
 */
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
  const requiredAgreed = TERMS_ITEMS.every(({ id, required }) => !required || agreed[id]);

  return (
    <TermsAgreementContext value={{ agreed, allAgreed, requiredAgreed, setAgreed, setAllAgreed }}>
      {children}
    </TermsAgreementContext>
  );
}
