'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { appBridge, isHandedOffToNativeTabs, isNativeShell } from '@/shared/bridge/client';
import { PageErrorState } from '@/shared/components/layout/PageErrorState';
import { LATE_OVERLAY_MS, PageLoading } from '@/shared/components/loading/PageLoading';
import { setAnalyticsConsent } from '@/shared/config/posthog';
import { usePushDeviceSync } from '@/shared/hooks/native/usePushDeviceSync';
import {
  getPageLoadingCount,
  subscribePageLoading,
} from '@/shared/lib/navigation/pageLoadingState';
import { readPendingInvitation } from '@/shared/lib/pendingInvitation';
import { useClearPersistedQueriesWhen, usePersistedOwnerReady } from '@/shared/query/persistence';
import { SIGNUP_PATHS } from '../constants/paths';
import { type SessionState, resolveAccess } from '../lib/accessPolicy';
import { markIntroSeen, readIntroSeen } from '../lib/introSeen';
import { type PostLoginDestinations, resolvePostLoginPath } from '../lib/postLoginPath';
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
 * 예외로 방금 가입을 마친 프로필 화면은 도착 화면으로 가는 동안 그대로 둬 전환이 재생되게 함(가입 완료 회원의 직접 진입은 로딩)
 * 비로그인(401)은 `sessionQueryOptions`가 `null`로 주고, 그 밖의 실패는 안내와 다시 시도(어디로 보낼지 모르므로 화면을 열지 않음)
 * 상태가 바뀌는 동작(로그인·약관 저장·가입 완료)은 `sharedKeys.session()`을 새 상태로 맞춰야 이 판단이 갱신됨(무효화 또는 캐시 갱신)
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

  // 이번 프로필 방문에서 가입 중 상태를 본 적이 있는지(방금 가입을 마친 경우와 가입 완료 회원의 재진입·직접 진입을 구분)
  // 프로필을 벗어나면 지움: layout의 상태는 화면 이동에도 남아 다시 들어온 방문에 이어지지 않게 함
  const onProfile = pathname === SIGNUP_PATHS.profile;
  const signingUp =
    onProfile && session?.kind === 'member' && session.onboarding.signupStatus === 'IN_PROGRESS';
  const [sawSigningUp, setSawSigningUp] = useState(false);
  if (signingUp && !sawSigningUp) setSawSigningUp(true);
  if (!onProfile && sawSigningUp) setSawSigningUp(false);
  // 방금 가입을 마친 프로필 화면은 이동하는 동안 그대로 둠(로딩 덮개로 바꾸면 도착 화면 전환이 재생되지 않음)
  const leavingSignup =
    sawSigningUp &&
    session?.kind === 'member' &&
    session.onboarding.signupStatus === 'COMPLETED' &&
    pathname === SIGNUP_PATHS.profile;

  // 프로필 작성 중이면 가입을 마친 뒤 갈 화면을 미리 받아 둠(시작하기 뒤 로딩 단축)
  const afterSignupPath =
    session?.kind === 'member' &&
    session.onboarding.signupStatus === 'IN_PROGRESS' &&
    pathname === SIGNUP_PATHS.profile &&
    hasPendingInvitation !== null
      ? resolvePostLoginPath(
          { ...session.onboarding, signupStatus: 'COMPLETED' },
          destinations,
          hasPendingInvitation,
        )
      : null;
  useEffect(() => {
    if (afterSignupPath) router.prefetch(afterSignupPath);
  }, [afterSignupPath, router]);

  // 비로그인이 확인되면 이전 사용자의 저장된 캐시를 지움(로그아웃은 화면을 새로 열어 여기서 확인됨)
  useClearPersistedQueriesWhen(session?.kind === 'anonymous');
  // 회원이면 저장본 주인을 확인한 뒤에 화면을 그림(다른 회원의 저장 데이터가 한 프레임도 보이지 않게)
  const ownerReady = usePersistedOwnerReady(
    session?.kind === 'member' ? String(session.onboarding.memberId) : undefined,
  );

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

  // 가입을 마친 회원의 쉘이면 이 기기의 푸시 토큰을 서버에 등록(서버가 가입 완료 계정만 받음, 기능명세서 7.5.2). 값이 같으면 보내지 않음
  usePushDeviceSync(
    session?.kind === 'member' && session.onboarding.signupStatus === 'COMPLETED'
      ? String(session.onboarding.memberId)
      : null,
  );

  // 도착지가 정해짐(도착 화면 또는 오류 안내를 그림)
  const settled =
    (!session && !isPending) ||
    Boolean(session && introSeen !== null && hasPendingInvitation !== null && !redirectTo);
  // 한 번 도착한 뒤 다시 로딩이면(가입 상태 변경·회원 전환) 열린 모달 등을 바로 막도록 덮개를 늦추지 않음
  const [wasSettled, setWasSettled] = useState(false);
  if (settled && !wasSettled) setWasSettled(true);
  // 도착 화면이 내용을 그릴 때까지(화면 전체 로딩이 없을 때) 스플래시 유지(명세 1.1: 빈 화면·중간 로딩이 보이지 않게)
  // 보이는 WebView만 보냄: 뒤에서 미리 그려지는 탭 WebView가 스플래시를 먼저 닫지 않게, 보이게 되면 그때 보냄
  const pageLoadingCount = useSyncExternalStore(subscribePageLoading, getPageLoadingCount, () => 1);
  const ready = settled && pageLoadingCount === 0;
  useEffect(() => {
    if (!ready) return;
    // 보내는 순간에도 다시 확인(같은 commit에 도착 화면이 로딩을 붙인 경우)
    const send = () => {
      // 탭 화면을 시작한 첫 화면 WebView는 곧 버려져 보내지 않음(탭 WebView가 보냄)
      if (isHandedOffToNativeTabs()) return;
      if (document.visibilityState === 'visible' && getPageLoadingCount() === 0) notifyAppReady();
    };
    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [ready]);

  if (!session && !isPending) {
    // 다시 시도 중에는 중복 요청만 막고 버튼은 그대로 둠(포커스 유지)
    return (
      <PageErrorState
        title="BUNCH"
        retrying={isFetching}
        onRetry={() => {
          if (!isFetching) void refetch();
        }}
      />
    );
  }
  if (
    !session ||
    introSeen === null ||
    hasPendingInvitation === null ||
    (redirectTo && !leavingSignup) ||
    (session.kind === 'member' && !ownerReady)
  ) {
    return (
      <>
        <p role="status" className="sr-only">
          {redirectTo ? '화면을 이동하는 중이에요' : '로그인 상태를 확인하는 중이에요'}
        </p>
        {/* 첫 확인은 보통 1초 안이라 넘길 때만 덮음(앱 탭 WebView가 열릴 때마다 덮개가 번쩍이지 않게), 스플래시 판정은 붙는 순간부터 */}
        <PageLoading delayMs={wasSettled ? 0 : LATE_OVERLAY_MS} />
      </>
    );
  }
  return children;
}
