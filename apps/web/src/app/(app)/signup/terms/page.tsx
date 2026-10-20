import { TermsAgreement } from '@/features/auth/components';
import { SIGNUP_PATHS } from '@/features/auth/constants/paths';

export default function SignupTermsPage() {
  return (
    <div
      data-ssgoi-transition={SIGNUP_PATHS.terms}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <TermsAgreement />
    </div>
  );
}
