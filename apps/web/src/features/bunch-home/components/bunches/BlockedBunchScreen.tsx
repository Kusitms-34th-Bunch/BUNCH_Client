'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useRef } from 'react';
import blockedBunch from '@/shared/assets/images/empty/blocked-bunch.svg';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

/**
 * 차단 관계인 번치에 들어왔을 때의 접근 제한 화면(화면설계서 2500:67470 3번, Figma 2500:69518)
 * 프로필·번들 등 기존 내용은 보이지 않고 뒤로 가기만 있음
 */
export function BlockedBunchScreen({
  onBack,
  focusTitle = false,
  checking = false,
  onRetry,
}: {
  onBack: () => void;
  /** 차단 여부를 확인하는 중(첫 hydration): 차단한 번치 내용이 먼저 보이지 않게 헤더만 */
  checking?: boolean | undefined;
  /** 이 화면에서 바로 차단해 화면이 바뀐 경우 제목으로 초점(누른 메뉴가 사라지므로) */
  focusTitle?: boolean | undefined;
  /** 서버 응답(403)으로만 판단한 경우 다시 받기(차단이 아닌 다른 이유의 403일 수 있음) */
  onRetry?: (() => void) | undefined;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      {checking ? (
        // 불러오는 동안 제목·내용 없이(차단한 번치 내용이 잠깐 보이지 않게) 상태만 알림
        <p role="status" className="sr-only">
          {BUNCH_HOME_MESSAGES.otherBunchLoading}
        </p>
      ) : (
        /* Figma 5991:164581: 이미지 72×72와 글자 사이 18, 제목·설명 사이 6
          화면 전체의 세로 가운데라 본문 기준 약 38 위(차단 목록 빈 상태와 같이 아래 여백 72) */
        <div className="px-padding-p8 pb-s23 flex min-h-full items-center justify-center">
          <div className="gap-s9 flex flex-col items-center text-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={blockedBunch as StaticImageData} alt="" width={72} height={72} />
            <div className="gap-s3 flex flex-col items-center">
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="typography-body-1-medium text-text-secondary focus:outline-none"
              >
                {BUNCH_HOME_MESSAGES.blockedBunchTitle}
              </h1>
              <p className="typography-caption-1-regular text-text-tertiary break-keep">
                {BUNCH_HOME_MESSAGES.blockedBunchDescription}
              </p>
            </div>
            {onRetry ? (
              <Button variant="tertiary" size="md" onClick={onRetry}>
                다시 시도
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
