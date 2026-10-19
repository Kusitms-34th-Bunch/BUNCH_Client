import { LoginEntry } from '@/features/auth/components';
import { LOGIN_PATH, SIGNUP_PATHS } from '@/features/auth/constants/paths';

export default function LoginPage() {
  return (
    <div
      data-ssgoi-transition={LOGIN_PATH}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <LoginEntry nextPath={SIGNUP_PATHS.terms} />
    </div>
  );
}
