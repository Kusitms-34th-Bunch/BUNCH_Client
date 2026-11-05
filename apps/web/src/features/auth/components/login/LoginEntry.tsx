'use client';

import { LoginButton } from '@app/design-system/web';
import Image from 'next/image';
import { PageShell } from '@/shared/components/layout/PageShell';
import {
  LOGIN_PENDING_MESSAGE,
  type SignIn,
  type SocialProvider,
  useSocialLogin,
} from '../../hooks/useSocialLogin';

// 앱 아이콘·로고·슬로건은 임시 디자인이라 최종 확정본으로 교체 예정
const APP_ICON = '/images/app-icon.png';
const BUNCH_LOGO = '/images/bunch-logo.svg';

// 순서가 곧 노출 순서(카카오 → Google → Apple)
const PROVIDERS: { provider: SocialProvider; label: string }[] = [
  { provider: 'kakao', label: '카카오 로그인' },
  { provider: 'google', label: 'Google로 계속하기' },
  { provider: 'apple', label: 'Apple로 계속하기' },
];

type LoginEntryProps = {
  /** 소셜 로그인 호출. 없으면(연결 전) 버튼을 눌러도 동작 없음 */
  signIn?: SignIn | undefined;
  /** 로그인 성공 시 이동할 경로. 라우트가 정해 전달 */
  nextPath: string;
};

/**
 * 앱을 처음 연 사람이 소셜 계정으로 시작하는 로그인(Entry) 화면
 * 회원가입 버튼 없음. 성공하면 `nextPath`(지금은 약관)로 이동만 처리(가입 상태별 분기·접근 제어는 미연결)
 */
export function LoginEntry({ signIn, nextPath }: LoginEntryProps) {
  const { pendingProvider, login } = useSocialLogin(signIn, nextPath);

  return (
    <PageShell
      bottom={
        <div className="px-padding-p8 pb-s10 gap-s4 flex flex-col">
          {PROVIDERS.map(({ provider, label }) => {
            const isPending = pendingProvider === provider;
            return (
              <LoginButton
                key={provider}
                brand={provider}
                // 어느 로그인이 진행 중인지 보이도록 진행 중인 버튼은 두고 나머지만 비활성화
                disabled={pendingProvider !== null && !isPending}
                aria-busy={isPending || undefined}
                onClick={() => void login(provider)}
              >
                {label}
              </LoginButton>
            );
          })}
          {/* 진행 중인 버튼은 aria-busy만으로는 읽히지 않는 경우가 많아 상태를 음성으로 안내(화면에는 숨김) */}
          <p role="status" className="sr-only">
            {pendingProvider ? LOGIN_PENDING_MESSAGE : ''}
          </p>
        </div>
      }
    >
      <div className="px-padding-p8 flex min-h-full flex-col items-center justify-center">
        <div className="gap-s12 flex flex-col items-center">
          <Image
            src={APP_ICON}
            alt=""
            width={120}
            height={120}
            priority
            className="rounded-r10 size-30 object-cover"
          />
          <div className="gap-s6 flex flex-col items-center">
            <h1>
              <Image src={BUNCH_LOGO} alt="Bunch" width={136} height={40} className="h-10 w-auto" />
            </h1>
            <p className="typography-body-1-medium text-text-tertiary text-center break-keep">
              함께한 순간을, 우리 그룹의 기록으로
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
