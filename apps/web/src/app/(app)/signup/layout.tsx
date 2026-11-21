import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TermsAgreementProvider } from '@/features/auth/contexts/TermsAgreementProvider';

// 가입 단계(약관·원문·프로필) 공통 제목, 내 계정 흐름이라 검색에서 제외
export const metadata: Metadata = { title: '회원가입', robots: { index: false } };

// 약관 동의·원문 화면 간 체크 상태 유지용 provider
export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col">
      <TermsAgreementProvider>{children}</TermsAgreementProvider>
    </div>
  );
}
