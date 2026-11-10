'use client';

import { isApiError } from '@app/api-core';
import { Button } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { PostLoginDestinations } from '../lib/postLoginPath';
import { STATUS_CHECK_FAILURE_MESSAGE } from '../hooks/useSocialLogin';
import { type SessionState, resolveAccess } from '../lib/accessPolicy';
import { markIntroSeen, readIntroSeen } from '../lib/introSeen';
import { sessionQueryOptions } from '../queries/session';

const subscribeNothing = () => () => {};
const unknownOnServer = () => null;

type AuthGateProps = {
  /** 가입을 마친 사용자의 도착 화면 경로(다른 feature 소유라 route가 전달) */
  destinations: PostLoginDestinations;
  children: ReactNode;
};

/**
 * 서버가 알려 준 로그인·가입 상태(`GET /members/me/onboarding`)로 화면 접근을 제어
 * 상태를 확인하는 동안과 다른 화면으로 보내는 동안은 화면 대신 `PageLoading`만 보임(보호된 화면이 잠깐 비치지 않게)
 * 401은 비로그인, 그 밖의 실패는 안내와 다시 시도(어디로 보낼지 모르므로 화면을 열지 않음)
 * 상태가 바뀌는 동작(로그인·약관 저장·가입 완료)은 `sharedKeys.session()`을 무효화해야 이 판단이 갱신됨
 */
export function AuthGate({ destinations, children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, isFetching, isPending, refetch } = useQuery(sessionQueryOptions());

  const unauthenticated = isApiError(error) && error.status === 401;
  const session: SessionState | undefined = data
    ? { kind: 'member', onboarding: data }
    : unauthenticated
      ? { kind: 'anonymous' }
      : undefined;
  // 서버·hydration 중에는 알 수 없어(null) 로딩으로 둠. 변경 알림 없이 렌더(이동)마다 다시 읽음
  // 인트로는 기록한 뒤 바로 이동하므로 그 렌더에서 새 값을 읽음
  const introSeen = useSyncExternalStore(subscribeNothing, readIntroSeen, unknownOnServer);
  const redirectTo =
    session && introSeen !== null
      ? resolveAccess(pathname, session, destinations, introSeen)
      : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // 이미 로그인한 사용자(인트로가 들어간 버전으로 업데이트)는 인트로를 보지 않고, 로그아웃해도 로그인 화면으로
  const isMember = session?.kind === 'member';
  useEffect(() => {
    if (isMember) markIntroSeen();
  }, [isMember]);

  if (!session && !isPending) {
    // Figma에 없는 상태. 번치 홈 오류 화면(`BunchHomeError`)과 같은 모양. 다시 시도 중에는 중복 요청만 막고 버튼은 그대로 둠(포커스 유지)
    return (
      <PageShell>
        <h1 className="sr-only">BUNCH</h1>
        <div className="gap-s8 px-s8 flex h-full flex-col items-center justify-center">
          <p role="alert" className="typography-body-3-semibold text-text-secondary text-center">
            {STATUS_CHECK_FAILURE_MESSAGE}
          </p>
          <Button
            variant="tertiary"
            size="md"
            aria-busy={isFetching || undefined}
            onClick={() => {
              if (!isFetching) void refetch();
            }}
          >
            다시 시도
          </Button>
        </div>
      </PageShell>
    );
  }
  if (!session || introSeen === null || redirectTo) {
    return (
      <>
        <p role="status" className="sr-only">
          {redirectTo ? '화면을 이동하는 중이에요' : '로그인 상태를 확인하는 중이에요'}
        </p>
        <PageLoading />
      </>
    );
  }
  return children;
}
