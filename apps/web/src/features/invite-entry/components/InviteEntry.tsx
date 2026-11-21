'use client';

import { isApiError } from '@app/api-core';
import { Button, ButtonLink, toast } from '@app/design-system';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react';
import wordmarkSvg from '@/shared/assets/images/login/wordmark.svg';
import { appBridge, isNativeShell } from '@/shared/bridge/client';
import { LATE_OVERLAY_MS, PageLoading } from '@/shared/components/loading/PageLoading';
import { useRefocusWhenEnabled } from '@/shared/hooks/useRefocusWhenEnabled';
import { copyText } from '@/shared/lib/clipboard';
import { savePendingInvitation } from '@/shared/lib/pendingInvitation';
import {
  APP_STORE_URL,
  INVITATION_INVALID_CODE,
  INVITE_ENTRY_MESSAGES,
  INVITE_LINK_ORIGIN,
} from '../constants/messages';
import { kakaoTalkReopenInviteUrl, openExternalUrl, openInviteUrl } from '../lib/externalLink';
import { isIosDevice, isKakaoTalkInApp } from '../lib/platform';
import { isInviteToken } from '../lib/token';
import { useLookupInvitationMutation } from '../queries/invitation';

const subscribeNothing = () => () => {};
// 서버·hydration 중에는 앱 밖으로 봄(브라우저 화면이 기본)
const outsideShellOnServer = () => false;

// 서버·hydration 중에는 설치할 수 있는 기기로 봄(App Store 링크가 기본)
const installableOnServer = () => true;
const HAND_OFF_GUARD_MS = 1500;

// SVG import 타입이 any라 정적 이미지로 명시. 로그인 화면과 같은 로고 파일(비율 171:43 = Figma 226:56.7)
const WORDMARK = wordmarkSvg as StaticImageData;
const BACKGROUND = '/images/invite/entry-bg.jpg';

type InviteEntryProps = {
  /** 주소의 초대 토큰 */
  token: string;
  /** 앱 안에서 링크가 유효할 때 이어 갈 경로(초대 정보를 보관한 뒤 접근 가드가 로그인·가입·초대 확인으로 안내). 다른 feature 소유라 route가 전달 */
  continueHref: string;
};

/** 픽셀 장식: 9px 정사각형 네 개로 이은 마름모(Figma `Pattern`) */
function PixelPattern({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`absolute size-6.75 ${className}`}>
      <span className="bg-icon-inversed absolute top-0 left-2.25 size-2.25" />
      <span className="bg-icon-inversed absolute top-2.25 left-0 size-2.25" />
      <span className="bg-icon-inversed absolute top-2.25 left-4.5 size-2.25" />
      <span className="bg-icon-inversed absolute top-4.5 left-2.25 size-2.25" />
    </div>
  );
}

/**
 * 카카오톡 등 앱 밖에서 초대 링크로 들어온 사람이 먼저 보는 페이지(Figma `6400:85935`)
 * 「초대장 확인하기」
 * - 앱 안: 공개 조회로 링크가 유효한지 확인한 뒤 초대 정보를 보관하고 `continueHref`로 이동(로그인 판별은 이동한 곳의 접근 가드)
 * - 앱 밖: 앱이 있으면 앱(초대 토큰 그대로), 없으면 App Store로 넘김(`continueInApp`)
 * 장식 모션은 CSS(`globals.css`의 `invite-rise-*`)가 첫 페인트부터 재생
 */
export function InviteEntry({ token, continueHref }: InviteEntryProps) {
  const router = useRouter();
  const lookup = useLookupInvitationMutation();
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const submitted = useRef(false);
  const { reset } = lookup;
  const checkDisabled = lookup.isPending || lookup.isSuccess;
  const [checkRef, refocusCheck] = useRefocusWhenEnabled<HTMLButtonElement>(!checkDisabled);
  // 앱 쉘 안(초대 링크가 유니버셜 링크로 앱을 엶)이면 설치 버튼을 숨기고 누르지 않아도 바로 확인
  const inShell = useSyncExternalStore(subscribeNothing, isNativeShell, outsideShellOnServer);
  const autoChecked = useRef(false);
  // iOS가 아닌 기기(Android·PC)는 App Store로 가는 링크 대신, 누르면 iOS 앱만 있다고 알리는 버튼(링크인데 이동하지 않는 혼란을 피함)
  const installable = useSyncExternalStore(subscribeNothing, isIosDevice, installableOnServer);

  // 앱 안에서 확인을 기다리는 중에 문서를 떠났다가 그대로 복원되면(bfcache) 잠금이 남아 버튼이 다시 동작하지 않으므로 처음 상태로 되돌림
  // 앱 밖은 조회·잠금 없이 바로 넘겨 해당하지 않음
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      submitted.current = false;
      reset();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [reset]);

  /**
   * 앱 밖: 브라우저는 소셜 로그인을 할 수 없어(네이티브 SDK 필요) 참여는 앱에서만 됨. 앱 설치 여부는 웹이 알 수 없어 iOS가 판단하게 넘김
   * - 카카오톡 인앱 브라우저(iOS): 밖에서 다시 열어 앱이 있으면 앱, 없으면 Safari의 이 페이지
   * - 그 밖의 iPhone·iPad: 다른 도메인(`open.bunch.kr`)으로 넘겨 앱이 있으면 유니버셜 링크로 앱(초대 토큰 그대로), 없으면 서버가 App Store로
   *   설치 뒤 붙여넣을 수 있게 초대 링크를 복사함
   * - iOS가 아닌 기기: 앱이 없어 안내만
   * iOS는 누른 그 순간의 이동이어야 앱을 열고 복사도 누른 동작 안에서만 허용해, 서버 조회를 기다리지 않고 바로 넘김(유효성은 앱이 확인)
   */
  // 연달아 눌러 복사·안내·이동이 겹치지 않게 막는 짧은 시간(이동이 막혀 이 페이지에 남으면 그 뒤 다시 누를 수 있음)
  const lastHandOff = useRef(0);
  const continueInApp = () => {
    if (!isIosDevice()) {
      toast(INVITE_ENTRY_MESSAGES.iosOnly);
      return;
    }
    const now = Date.now();
    if (now - lastHandOff.current < HAND_OFF_GUARD_MS) return;
    lastHandOff.current = now;
    if (isKakaoTalkInApp()) {
      openExternalUrl(kakaoTalkReopenInviteUrl(token));
      return;
    }
    // 안내 없이 복사만 함(곧바로 앱·App Store로 넘어가 토스트는 보이자마자 사라짐. 안내를 보이려고 이동을 늦추면 누른 동작으로 인정되지 않아 앱이 열리지 않을 수 있음)
    void copyText(`${INVITE_LINK_ORIGIN}/invite/${token}`);
    openExternalUrl(openInviteUrl(token));
  };

  const check = () => {
    if (submitted.current) return;
    // 앱 안에서 링크로 처음 실행됐으면 접근 가드를 거치지 않아 이 화면에 머물 때 스플래시를 직접 닫음(여러 번 불러도 쉘이 한 번만 처리)
    const showThisScreen = () => {
      if (inShell) void appBridge.appReady().catch(() => {});
    };
    if (!isInviteToken(token)) {
      showThisScreen();
      toast(INVITE_ENTRY_MESSAGES.invalidInvitation);
      return;
    }
    if (!inShell) {
      continueInApp();
      return;
    }
    submitted.current = true;
    lookup.mutate(token, {
      onSuccess: () => {
        // 로그인·가입을 거치는 동안 유지할 초대 정보를 보관한 뒤 이어 감(성공은 이동이 끝날 때까지 중복 요청을 막음)
        savePendingInvitation(token);
        // 이 화면을 거치지 않은 흐름이라 history에 남기지 않음(뒤로 가기로 돌아와 다시 확인되지 않게)
        router.replace(continueHref);
      },
      onError: (error) => {
        submitted.current = false;
        refocusCheck();
        showThisScreen();
        toast(
          isApiError(error) && error.code === INVITATION_INVALID_CODE
            ? INVITE_ENTRY_MESSAGES.invalidInvitation
            : INVITE_ENTRY_MESSAGES.temporaryFailure,
        );
      },
    });
  };

  // 앱 안에서는 한 번만 바로 확인(실패하면 이 화면에서 다시 누를 수 있음)
  const checkOnce = useEffectEvent(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;
    check();
  });
  useEffect(() => {
    if (inShell) checkOnce();
  }, [inShell]);

  // 카카오톡 인앱 브라우저(iOS)에서는 유니버셜 링크가 앱을 열지 않을 수 있어, 열리자마자 한 번 밖에서 다시 열기를 요청
  // 막히면 이 페이지에 그대로 남고 「초대장 확인하기」가 같은 요청을 다시 함. 형식이 아닌 링크는 보내지 않음(이 페이지에서 무효 안내)
  // 한 번만(개발 모드의 effect 두 번 실행에도), 앱 WebView 안에서는 하지 않음
  const reopenedFromKakaoTalk = useRef(false);
  useEffect(() => {
    if (reopenedFromKakaoTalk.current || isNativeShell()) return;
    if (!isKakaoTalkInApp() || !isIosDevice() || !isInviteToken(token)) return;
    reopenedFromKakaoTalk.current = true;
    openExternalUrl(kakaoTalkReopenInviteUrl(token));
  }, [token]);

  return (
    <main className="relative isolate mx-auto flex min-h-dvh w-full max-w-(--app-max-width) flex-col overflow-hidden bg-black">
      <Image
        src={BACKGROUND}
        alt=""
        fill
        priority
        // 이미 적정 압축된 한 장짜리 배경이라 기본 최적화(품질 75로 다시 압축)를 건너뛰고 원본 품질로 냄
        unoptimized
        sizes="(max-width: 430px) 100vw, 430px"
        className="-z-20 object-cover"
      />
      {/* Figma 딤 검정 40%(`primitive-black-alpha-40`)와 아래 그라데이션(높이 226, 위로 갈수록 투명) */}
      <div
        aria-hidden="true"
        className="bg-primitive-black-alpha-40 pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56.5 bg-[linear-gradient(to_top,rgb(0_0_0/0.65)_16.499%,rgb(0_0_0/0.4)_54.139%,rgb(0_0_0/0.08)_90.299%,rgb(0_0_0/0)_98.68%)]"
      />

      <PixelPattern className="invite-rise-pattern-left top-[25.34%] left-[10.67%]" />
      <PixelPattern className="invite-rise-pattern-right top-[13.53%] right-[8.53%]" />
      <span
        aria-hidden="true"
        className="invite-rise-module bg-icon-inversed absolute top-58.25 left-[calc(20%-2px)] size-2.25"
      />

      <div className="invite-rise-logo gap-s8 px-padding-p8 relative flex flex-col items-center pt-31.5">
        <h1>
          <Image src={WORDMARK} alt="Bunch" width={226} height={57} priority />
        </h1>
        <p className="typography-body-3-regular text-text-inversed text-center">
          함께한 순간이 모이는 곳
        </p>
      </div>

      <div className="flex-1" />
      {/* data-toast-anchor: toast()가 이 영역 위 4px에 토스트를 놓음(로그인 화면과 같은 방식) */}
      <div
        data-toast-anchor="wrapper"
        className="gap-s3 px-padding-p8 pb-padding-p19 flex flex-col"
      >
        {/* iPhone·iPad는 외부 주소로 가는 동작이라 링크(같은 탭에서 열어 인앱 브라우저의 새 탭 차단을 피함, 기능명세 2.7.1)
            그 밖의 기기는 이동할 곳이 없어 같은 모양의 버튼으로 안내만, 이미 앱 안이면 숨김 */}
        {inShell ? null : installable ? (
          <ButtonLink href={APP_STORE_URL} variant="secondary" className="w-full">
            앱 설치하기
          </ButtonLink>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => toast(INVITE_ENTRY_MESSAGES.iosOnly)}
          >
            앱 설치하기
          </Button>
        )}
        <Button
          variant="brand"
          className="w-full"
          // 앱 안에서 확인하는 동안과 이동할 때까지 비활성(화면을 덮지 않고 누름만 막음). 앱 밖은 잠그지 않고 바로 넘김
          ref={checkRef}
          disabled={checkDisabled}
          aria-busy={checkDisabled || undefined}
          onClick={check}
        >
          초대장 확인하기
        </Button>
      </div>
      <div aria-hidden="true" className="h-(--safe-area-bottom) shrink-0" />

      {/* 확인 중 상태를 스크린 리더에 알림(화면에는 숨김) */}
      <p role="status" className="sr-only">
        {lookup.isPending
          ? '초대 링크를 확인하는 중이에요'
          : lookup.isSuccess
            ? '화면을 이동하는 중이에요'
            : ''}
      </p>
      {/* 짧은 동작이라 버튼만 비활성, 1초를 넘기면 그때 덮음(motion.md 로딩 상태) */}
      {lookup.isPending || lookup.isSuccess ? <PageLoading delayMs={LATE_OVERLAY_MS} /> : null}
    </main>
  );
}
