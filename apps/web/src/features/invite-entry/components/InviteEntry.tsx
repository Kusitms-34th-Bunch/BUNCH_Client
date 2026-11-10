'use client';

import { isApiError } from '@app/api-core';
import { Button, toast } from '@app/design-system';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import wordmarkSvg from '@/shared/assets/images/login/wordmark.svg';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { savePendingInvitation } from '@/shared/lib/pendingInvitation';
import { INVITATION_INVALID_CODE, INVITE_ENTRY_MESSAGES } from '../constants/messages';
import { useLookupInvitationMutation } from '../queries/invitation';

// 초대 토큰은 Base64URL(43자)이고 보조 코드는 8자라 길이는 넉넉히, 경로를 깨뜨리는 문자(`/`·`.`·`%` 등)만 거름
// 형식이 아닌 링크는 서버에 묻지 않고 무효로 처리(BFF 경로 검사에 걸려 일시적 오류로 오인되는 것과 무효 입력 횟수 제한 소진을 막음)
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// SVG import 타입이 any라 정적 이미지로 명시. 로그인 화면과 같은 로고 파일(비율 171:43 = Figma 226:56.7)
const WORDMARK = wordmarkSvg as StaticImageData;
const BACKGROUND = '/images/invite/entry-bg.jpg';

type InviteEntryProps = {
  /** 주소의 초대 토큰 */
  token: string;
  /** 링크가 유효할 때 이어 갈 경로(초대 정보를 보관한 뒤 접근 가드가 로그인·가입·초대 확인으로 안내). 다른 feature 소유라 route가 전달 */
  continueHref: string;
  /** 앱스토어로 이동. 유니버셜 링크를 붙일 때 연결하며, 없으면 눌렀을 때 곧 지원된다는 안내만 보임 */
  onInstallApp?: (() => void) | undefined;
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
 * 「초대장 확인하기」는 공개 조회로 링크가 유효한지 확인한 뒤 초대 정보를 보관하고 `continueHref`로 이동
 * 로그인 판별은 이동한 곳의 접근 가드가 맡음(비로그인은 로그인으로, 로그인은 초대 확인으로)
 * 장식 모션은 CSS(`globals.css`의 `invite-rise-*`)가 첫 페인트부터 재생
 */
export function InviteEntry({ token, continueHref, onInstallApp }: InviteEntryProps) {
  const router = useRouter();
  const lookup = useLookupInvitationMutation();
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const submitted = useRef(false);
  const { reset } = lookup;

  // 이동한 뒤 뒤로 가기로 이 화면이 그대로 복원되면(bfcache) 성공 상태의 로딩이 남아 버튼이 다시 동작하지 않으므로 처음 상태로 되돌림
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      submitted.current = false;
      reset();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [reset]);

  const check = () => {
    if (submitted.current) return;
    if (!TOKEN_PATTERN.test(token)) {
      toast(INVITE_ENTRY_MESSAGES.invalidInvitation);
      return;
    }
    submitted.current = true;
    lookup.mutate(token, {
      onSuccess: () => {
        // 로그인·가입을 거치는 동안 유지할 초대 정보를 보관한 뒤 이어 감(성공은 이동이 끝날 때까지 중복 요청을 막음)
        savePendingInvitation(token);
        router.push(continueHref);
      },
      onError: (error) => {
        submitted.current = false;
        toast(
          isApiError(error) && error.code === INVITATION_INVALID_CODE
            ? INVITE_ENTRY_MESSAGES.invalidInvitation
            : INVITE_ENTRY_MESSAGES.temporaryFailure,
        );
      },
    });
  };

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
        <Button
          variant="secondary"
          className="w-full"
          onClick={onInstallApp ?? (() => toast(INVITE_ENTRY_MESSAGES.installComingSoon))}
        >
          앱 설치하기
        </Button>
        <Button
          variant="brand"
          className="w-full"
          disabled={lookup.isPending}
          aria-busy={lookup.isPending || undefined}
          onClick={check}
        >
          초대장 확인하기
        </Button>
      </div>
      <div aria-hidden="true" className="h-(--safe-area-bottom) shrink-0" />

      {/* 확인 중 상태를 스크린 리더에 알림(화면에는 숨김) */}
      <p role="status" className="sr-only">
        {lookup.isPending ? '초대 링크를 확인하는 중이에요' : ''}
      </p>
      {lookup.isPending || lookup.isSuccess ? <PageLoading /> : null}
    </main>
  );
}
