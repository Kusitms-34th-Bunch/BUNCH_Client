'use client';

import { LoginButton } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import symbolSvg from '@/shared/assets/images/login/symbol.svg';
import wordmarkSvg from '@/shared/assets/images/login/wordmark.svg';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { PostLoginDestinations } from '../../lib/postLoginPath';
import {
  LOGIN_PENDING_MESSAGE,
  type SignIn,
  type SocialProvider,
  useSocialLogin,
} from '../../hooks/useSocialLogin';
import { signInWithSocial } from '../../lib/socialSignIn';
import { usePostLoginPath } from '../../queries/session';

// SVG import 타입이 any라 정적 이미지로 명시
const SYMBOL = symbolSvg as StaticImageData;
const WORDMARK = wordmarkSvg as StaticImageData;
// 배경 영상(Figma 4744:90759, 원본 47MB를 H.264 CRF 18로 다시 압축해 약 2.7MB)과 첫 프레임 포스터
const BACKGROUND_VIDEO = '/videos/login.mp4';
const BACKGROUND_POSTER = '/videos/login-poster.jpg';

// 순서가 곧 노출 순서(카카오 → Google → Apple)
const PROVIDERS: { provider: SocialProvider; label: string }[] = [
  { provider: 'kakao', label: '카카오 로그인' },
  { provider: 'google', label: 'Google로 계속하기' },
  { provider: 'apple', label: 'Apple로 계속하기' },
];

type LoginEntryProps = {
  /** 소셜 로그인 호출. 기본은 쉘 SDK → BFF 로그인, 테스트에서 대체 */
  signIn?: SignIn | undefined;
  /** 가입을 마친 사용자의 도착 화면 경로(다른 feature 소유라 route가 전달) */
  destinations: PostLoginDestinations;
  /** 로그인 성공 뒤 이동할 경로를 정함. 기본은 서버의 가입 상태에 따른 도착 화면, 테스트에서 대체 */
  resolveNextPath?: (() => Promise<string | { path: string; replace: boolean }>) | undefined;
};

/**
 * 앱을 처음 연 사람이 소셜 계정으로 시작하는 로그인(Entry) 화면
 * 회원가입 버튼 없음. 성공하면 서버의 가입 상태에 따라 약관·프로필·번치 홈·번치 시작 선택으로 이동(접근 제어는 `AuthGate`)
 * 로그인은 쉘의 소셜 SDK로 받은 토큰을 BFF에 보내는 `signInWithSocial`이 처리(브라우저에서는 실패 토스트)
 */
export function LoginEntry({
  signIn = signInWithSocial,
  destinations,
  resolveNextPath,
}: LoginEntryProps) {
  const resolvePostLogin = usePostLoginPath(destinations);
  const { pendingProvider, login } = useSocialLogin(signIn, resolveNextPath ?? resolvePostLogin);
  const reducedMotion = useReducedMotion();

  return (
    <>
      {/* 화면 전체(Safe Area 포함)를 덮는 배경. 동작 줄이기 설정이면 영상을 받지 않고 첫 프레임만 보임 */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-1/2 w-full max-w-(--app-max-width) -translate-x-1/2 bg-cover bg-center"
        style={{ backgroundImage: `url(${BACKGROUND_POSTER})` }}
      >
        {/* iOS 자동 재생 조건: muted·playsInline */}
        {reducedMotion ? null : (
          <video
            src={BACKGROUND_VIDEO}
            poster={BACKGROUND_POSTER}
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
          />
        )}
        {/* Figma 겹침: 위 절반 검정 30%, 61%부터 60%(30%는 토큰이 없어 가장 가까운 40%) */}
        <div className="from-primitive-black-alpha-40 to-primitive-black-alpha-60 absolute inset-0 bg-linear-to-b from-50% to-61%" />
      </div>
      <PageShell
        className="relative bg-transparent"
        bottom={
          <div className="px-padding-p8 pb-padding-p7 gap-s4 flex flex-col">
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
        {/* 로고는 버튼 바로 위(Figma 버튼과 34px, 가까운 토큰 32px) */}
        <div className="px-padding-p8 pb-s14 gap-s3 flex min-h-full flex-col items-center justify-end">
          <Image src={SYMBOL} alt="" width={40} height={34} priority />
          <div className="gap-s4 flex flex-col items-center">
            <h1>
              <Image src={WORDMARK} alt="Bunch" width={166} height={45} priority />
            </h1>
            <p className="typography-caption-1-medium text-text-inversed text-center font-semibold break-keep">
              함께한 순간이 뭉쳐, 우리가 되는 곳
            </p>
          </div>
        </div>
      </PageShell>
    </>
  );
}
