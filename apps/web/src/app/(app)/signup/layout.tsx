import type { ReactNode } from 'react';
import { TermsAgreementProvider } from '@/features/auth/contexts/TermsAgreementProvider';

// 약관 동의·원문 화면 간 체크 상태 유지용 provider
export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col">
      <TermsAgreementProvider>{children}</TermsAgreementProvider>
    </div>
  );
}
