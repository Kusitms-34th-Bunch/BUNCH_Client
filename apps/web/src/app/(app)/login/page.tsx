import { LoginEntry } from '@/features/auth/components';

export default function LoginPage() {
  return (
    <div className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col">
      <LoginEntry />
    </div>
  );
}
