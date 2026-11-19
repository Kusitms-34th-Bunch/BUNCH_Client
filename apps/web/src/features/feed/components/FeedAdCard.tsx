'use client';

import { cn, ConfirmDialog } from '@app/design-system';
import { AdPhotoCard, ConfirmSheet } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import placeHidden from '@/shared/assets/images/empty/place-hidden.svg';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { playHaptic } from '@/shared/lib/haptic';
import type { FeedAd } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { useFeedViewer } from '../hooks/useFeedViewer';
import { subjectParticle } from '../lib/josa';
import { useAdKokMutation, useHideAdMutation } from '../queries/advertisement';

// 연타로 둘째 탭이 콕 취소로 넘어가지 않게 첫 탭만 받는 간격(기능명세서 6.1.5)
const PICK_TAP_GUARD_MS = 400;
// 숨김 안내를 보여 주는 시간과, 그 뒤 카드가 접히며 사라지는 시간(요청 값, Figma에 없음)
const HIDDEN_NOTICE_MS = 4000;
const COLLAPSE_MS = 400;

/**
 * 피드 광고 카드(기능명세서 6.1.5~6.1.6, Figma `5081:51444`·`5367:102664`): 콕하기와 더보기 → 확인 시트 → 숨김 안내 → 접히며 사라짐
 * 콕은 명세 022·009, 숨김은 명세 023(숨긴 광고는 서버가 피드에서 뺌). 사진을 눌러 외부로 나가는 동작은 bridge가 정해지면 추가
 */
export function FeedAdCard({
  ad,
  onGone,
}: {
  ad: FeedAd;
  /** 다 사라졌을 때. 초점이 카드에 있었는지를 함께 알림 */
  onGone: (_adId: string, _hadFocus: boolean) => void;
}) {
  const { viewer, asBunch } = useFeedViewer();
  const kok = useAdKokMutation();
  const hide = useHideAdMutation();
  // 확인 창이 열린 사이 명의가 바뀌었는지 볼 때 그 시점의 명의
  const viewerId = usePreservedCallback(() =>
    viewer === undefined ? undefined : (viewer?.bunchId ?? null),
  );
  const reducedMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  // 시트가 다 닫힌 뒤에 받는 중 문구를 채움(닫히는 동안 배경의 알림은 읽히지 않음)
  const [sheetClosed, setSheetClosed] = useState(true);
  const openOverlay = useScreenOverlay();
  const lastPickTap = useRef(0);
  const cardRef = useRef<HTMLElement>(null);

  // 더보기 버튼이 사라지므로 초점을 숨김 카드로 옮김(응답을 기다리는 사이 다른 곳으로 옮겼으면 그대로)
  useEffect(() => {
    if (!hidden) return;
    const active = document.activeElement;
    if (!active || active === document.body) cardRef.current?.focus();
  }, [hidden]);

  useEffect(() => {
    if (!hidden) return;
    const timer = setTimeout(() => setCollapsing(true), HIDDEN_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [hidden]);

  useEffect(() => {
    if (!collapsing) return;
    const timer = setTimeout(
      () => onGone(ad.id, cardRef.current?.contains(document.activeElement) ?? false),
      reducedMotion ? 0 : COLLAPSE_MS,
    );
    return () => clearTimeout(timer);
  }, [ad.id, collapsing, onGone, reducedMotion]);

  const isPicked = viewer === null ? false : ad.picked;

  // 확인하면 바로 보내고(닫히는 중 화면을 떠나도 숨기기로 정한 것은 보냄), 시트가 다 닫힌 뒤 성공했으면 숨김 안내로 바꿈
  // 실패 안내는 mutation의 공통 토스트. 받는 동안 더보기는 무시하고 카드는 aria-busy와 상태 문구로 알림
  const openHideConfirm = () => {
    if (hide.isPending) return;
    setSheetClosed(false);
    let result: Promise<boolean> | undefined;
    openOverlay(
      (rootProps, close) => (
        <ConfirmSheet
          {...rootProps}
          title={
            <>
              {text.adHideTitle}
              <span className="sr-only"> {ad.title}</span>
            </>
          }
          description={text.adHideDescription}
          // Figma 5367:102664: 72×72(일러스트 자리 size-18)
          illustration={
            <Image
              src={placeHidden as StaticImageData}
              alt=""
              width={72}
              height={72}
              className="size-full"
            />
          }
          illustrationClassName="size-18"
          confirmLabel={text.adHide}
          onConfirm={() => {
            result = new Promise((resolve) =>
              hide.mutate(ad.id, {
                onSuccess: () => resolve(true),
                onError: () => resolve(false),
              }),
            );
            close();
          }}
        />
      ),
      // 시트가 다 닫힌 뒤 숨겨 초점이 더보기 버튼을 거쳐 숨김 카드로 옮겨 가게 함
      () => {
        setSheetClosed(true);
        void result?.then((done) => done && setHidden(true));
      },
    );
  };

  // 시트를 연 명의로만 보냄(그사이 명의가 바뀌었으면 보내지 않음)
  const openPickCancel = (pinId: number, openedAs: string) =>
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={text.pickCancelTitle}
        description={text.pickCancelDescription(ad.title, subjectParticle(ad.title))}
        cancelLabel={text.pickCancelNo}
        confirmLabel={text.pickCancelConfirm}
        onConfirm={() => {
          if (viewerId() === openedAs) {
            kok.mutate({ adId: ad.id, viewerId: openedAs, pin: false, pinId });
          }
          close();
        }}
      />
    ));

  return (
    // 높이를 0으로 접고 목록 간격(32)만큼 위로 당겨, 항목이 빠질 때 아래 내용이 튀지 않게 함
    <li
      className={cn(
        'grid grid-rows-[1fr] transition-[grid-template-rows,opacity,margin-top] duration-400 ease-out motion-reduce:transition-none',
        collapsing && '-mt-s14 grid-rows-[0fr] opacity-0',
      )}
    >
      <p role="status" className="sr-only">
        {hide.isPending && sheetClosed ? text.adHiding : null}
      </p>
      {/* 같은 위치의 카드로 바꿔 알림 영역을 유지해 숨김 안내가 낭독되게 함 */}
      <div className={cn('min-h-0', hidden && 'overflow-hidden')}>
        {hidden ? (
          <AdPhotoCard
            ref={cardRef}
            state="hidden"
            title={ad.title}
            // 초점 낭독에 밀려 알림이 안 읽혀도 결과가 전달되게 이름에 안내를 포함
            aria-label={text.adHiddenCardLabel(ad.title)}
          />
        ) : (
          <AdPhotoCard
            title={ad.title}
            titleAs="h2"
            imageSrc={ad.imageSrc}
            logoSrc={ad.logoSrc}
            tagline={ad.tagline}
            description={ad.description}
            location={ad.location}
            tags={ad.tags}
            picked={isPicked}
            onPick={() => {
              const now = Date.now();
              if (now - lastPickTap.current < PICK_TAP_GUARD_MS) return;
              lastPickTap.current = now;
              asBunch(() => {
                if (!viewer) return;
                const bunchId = viewer.bunchId;
                // 콕 응답 전(콕 ID 없음)에는 취소를 받지 않음. 콕하기를 누를 때만 햅틱(Figma 햅틱 모음)
                if (!isPicked) {
                  playHaptic('tap');
                  kok.mutate({ adId: ad.id, viewerId: bunchId, pin: true });
                } else if (ad.pinId !== undefined) openPickCancel(ad.pinId, bunchId);
              });
            }}
            onMore={openHideConfirm}
            aria-busy={hide.isPending || undefined}
          />
        )}
      </div>
    </li>
  );
}
