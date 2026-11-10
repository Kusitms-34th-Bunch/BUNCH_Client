'use client';

import { Button } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { appBridge, isNativeShell } from '@/shared/bridge/client';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { setAnalyticsConsent } from '@/shared/config/posthog';
import { readPendingInvitation } from '@/shared/lib/pendingInvitation';
import type { PostLoginDestinations } from '../lib/postLoginPath';
import { STATUS_CHECK_FAILURE_MESSAGE } from '../hooks/useSocialLogin';
import { type SessionState, resolveAccess } from '../lib/accessPolicy';
import { markIntroSeen, readIntroSeen } from '../lib/introSeen';
import { sessionQueryOptions } from '../queries/session';

const subscribeNothing = () => () => {};
const unknownOnServer = () => null;
/** 로그인·가입을 마친 뒤 이어 갈 초대가 보관돼 있는지(초대 링크로 들어온 사용자) */
const readHasPendingInvitation = () => readPendingInvitation() !== null;

let appReadySent = false;
/** 앱 쉘에 첫 화면 준비를 한 번만 알림(이전 버전 앱이라 메서드가 없어도 무시) */
const notifyAppReady = () => {
  if (appReadySent || !isNativeShell()) return;
  appReadySent = true;
  void appBridge.appReady().catch(() => {});
};
type AuthGateProps = {
  /** 가입을 마친 사용자의 도착 화면 경로(다른 feature 소유라 route가 전달) */
  destinations: PostLoginDestinations;
  children: ReactNode;
};

/**
 * 서버가 알려 준 로그인·가입 상태(`GET /members/me/onboarding`)로 화면 접근을 제어
 * 상태를 확인하는 동안과 다른 화면으로 보내는 동안은 화면 대신 `PageLoading`만 보임(보호된 화면이 잠깐 비치지 않게)
 * 비로그인(401)은 `sessionQueryOptions`가 `null`로 주고, 그 밖의 실패는 안내와 다시 시도(어디로 보낼지 모르므로 화면을 열지 않음)
 * 상태가 바뀌는 동작(로그인·약관 저장·가입 완료)은 `sharedKeys.session()`을 무효화해야 이 판단이 갱신됨
 */
export function AuthGate({ destinations, children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isFetching, isPending, refetch } = useQuery(sessionQueryOptions());

  // 비로그인은 query 데이터 `null`(다시 읽는 동안에도 유지)
  const session: SessionState | undefined =
    data === undefined
      ? undefined
      : data === null
        ? { kind: 'anonymous' }
        : { kind: 'member', onboarding: data };
  // 서버·hydration 중에는 알 수 없어(null) 로딩으로 둠. 변경 알림 없이 렌더(이동)마다 다시 읽음
  // 인트로는 기록한 뒤 바로 이동하므로 그 렌더에서 새 값을 읽음
  const introSeen = useSyncExternalStore(subscribeNothing, readIntroSeen, unknownOnServer);
  const hasPendingInvitation = useSyncExternalStore(
    subscribeNothing,
    readHasPendingInvitation,
    unknownOnServer,
  );
  const redirectTo =
    session && introSeen !== null && hasPendingInvitation !== null
      ? resolveAccess(pathname, session, destinations, introSeen, hasPendingInvitation)
      : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // 이미 로그인한 사용자(인트로가 들어간 버전으로 업데이트)는 인트로를 보지 않고, 로그아웃해도 로그인 화면으로
  const isMember = session?.kind === 'member';
  useEffect(() => {
    if (isMember) markIntroSeen();
  }, [isMember]);

  // 제품 분석은 약관에 동의한 회원만 수집(ADR 018). 상태를 모르는 동안은 바꾸지 않음
  // 동의한 회원의 ID, 비로그인·미동의는 null
  const analyticsMember =
    session === undefined
      ? undefined
      : session.kind === 'member' && session.onboarding.termsAccepted
        ? String(session.onboarding.memberId)
        : null;
  useEffect(() => {
    if (analyticsMember !== undefined) void setAnalyticsConsent(analyticsMember).catch(() => {});
  }, [analyticsMember]);

  // 도착 화면이나 오류 안내를 그리게 되면 앱 쉘에 알려 스플래시를 닫음(명세 1.1: 도착지가 정해질 때까지 스플래시 유지)
  const settled =
    (!session && !isPending) ||
    Boolean(session && introSeen !== null && hasPendingInvitation !== null && !redirectTo);
  useEffect(() => {
    if (settled) notifyAppReady();
  }, [settled]);

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
  if (!session || introSeen === null || hasPendingInvitation === null || redirectTo) {
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
