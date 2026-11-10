import { Button } from '@app/design-system';
import { PaginationIndicator } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { GUIDE_IMAGES } from './guideImages';

const PAGES = [
  { title: ['각자 찍은 사진을', '하나의 사진함에 모아요'], image: GUIDE_IMAGES[0] },
  { title: ['멤버들과 함께', '하나의 번들을 완성해요'], image: GUIDE_IMAGES[1] },
  { title: ['완성한 번들을 공유하고', '다른 번치와 연결돼요'], image: GUIDE_IMAGES[2] },
  { title: ['다음에 가고 싶은 곳,', '우리끼리 콕!'], image: GUIDE_IMAGES[3] },
];
const LAST = PAGES.length - 1;
// 프로토타입 명세(Figma `6105:42792`): 사라짐 350ms → 50ms 뒤 나타남 700ms. 하단 바는 고정
// 명세는 문구가 제자리에서 흐려지고 12px만 올라오지만, 그림(24·32px)과 거리가 달라 같은 시간에 따로 노는 것처럼 보여 그림과 같은 거리로 함께 움직임(디자이너 확인 필요)
const LEAVE = {
  duration: 350,
  easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
  fill: 'forwards',
} as const;
const ENTER = {
  duration: 700,
  delay: 50,
  easing: 'cubic-bezier(0.25, 0.1, 0.15, 1)',
  fill: 'backwards',
} as const;
// 왼쪽으로 이만큼 밀면 다음(앞으로만)
const SWIPE_PX = 50;

/**
 * 온보딩 가이드 05~08(Figma `6079:175566`): 「다음」이나 왼쪽 스와이프로 다음 장, 4장의 「시작하기」로 끝
 * 동작 줄이기면 전환 없이 바로 바뀜
 */
export function IntroGuide({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const reducedMotion = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const moving = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const entered = useRef(false);

  // 인트로에서 넘어오면 같은 route라 화면 이동 초점(RouteFocus)이 없어 제목으로 옮김
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // 인트로 브랜드 화면이 흐려진 뒤 첫 장도 장 전환의 '나타남'으로 들어옴(사라짐 뒤 간격은 인트로가 둠, 하단 바는 투명도만)
  useEffect(() => {
    // 첫 장에 들어올 때 한 번만
    if (entered.current) return;
    entered.current = true;
    const title = titleRef.current;
    const image = imageRef.current;
    const bottom = bottomRef.current;
    if (reducedMotion || !title || !image || !bottom || typeof image.animate !== 'function') return;
    const timing = { ...ENTER, delay: 0 };
    image.animate(
      [
        { transform: 'translateY(32px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      timing,
    );
    title.animate(
      [
        { transform: 'translateY(32px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      timing,
    );
    bottom.animate([{ opacity: 0 }, { opacity: 1 }], timing);
  }, [reducedMotion]);

  // 전환 애니메이션이 취소되면(화면 이탈 등) finished가 거절되므로 부르는 쪽에서 무시
  const next = async () => {
    if (moving.current) return;
    if (page === LAST) return onDone();
    const title = titleRef.current;
    const image = imageRef.current;
    if (reducedMotion || !title || !image || typeof image.animate !== 'function') {
      setPage(page + 1);
      return;
    }
    moving.current = true;
    try {
      await Promise.all([
        image.animate({ transform: 'translateY(-24px)', opacity: 0 }, LEAVE).finished,
        title.animate({ transform: 'translateY(-24px)', opacity: 0 }, LEAVE).finished,
      ]);
      flushSync(() => setPage(page + 1));
      // 새 그림이 그려지기 전에 떠오르지 않게 디코딩을 기다림
      await image.decode().catch(() => {});
      image.getAnimations().forEach((animation) => animation.cancel());
      title.getAnimations().forEach((animation) => animation.cancel());
      // 나타나는 동안의 입력은 받음(탭이 씹히지 않게)
      moving.current = false;
      await Promise.all([
        image.animate(
          [
            { transform: 'translateY(32px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          ENTER,
        ).finished,
        title.animate(
          [
            { transform: 'translateY(32px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          ENTER,
        ).finished,
      ]);
    } finally {
      // 전환이 취소돼도(화면 이탈 등) 다음 입력을 막지 않게
      moving.current = false;
    }
  };

  const current = PAGES[page]!;
  return (
    <PageShell
      bottom={
        <div ref={bottomRef} className="px-padding-p8 h-s16 flex items-center justify-between">
          {/* Figma Indicator: 점 묶음 둘레 10px */}
          <PaginationIndicator total={PAGES.length} current={page + 1} className="p-2.5" />
          <Button
            size="md"
            variant={page === LAST ? 'brand' : 'primary'}
            onClick={() => void next().catch(() => {})}
          >
            {page === LAST ? '시작하기' : '다음'}
          </Button>
        </div>
      }
    >
      <div
        className="pt-s16 gap-s13 flex h-full touch-pan-y flex-col items-center overflow-hidden"
        onPointerDown={(event) => {
          swipeStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start || page === LAST) return;
          const dx = event.clientX - start.x;
          if (dx < -SWIPE_PX && Math.abs(dx) > Math.abs(event.clientY - start.y))
            void next().catch(() => {});
        }}
      >
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="typography-title-1-bold text-text-primary shrink-0 text-center focus:outline-none"
        >
          {current.title[0]} <br />
          {current.title[1]}
        </h1>
        {/* 장이 바뀌어도 초점은 버튼에 있어 새 제목을 따로 알림(처음 장은 제목 초점으로 읽힘) */}
        <p aria-live="polite" className="sr-only">
          {page === 0 ? '' : `${page + 1} / ${PAGES.length}, ${current.title.join(' ')}`}
        </p>
        {/* 앱 화면 예시라 문구가 뜻을 전함. 모서리가 투명한 그림이라 그림자는 모양을 따르는 drop-shadow */}
        {/* Figma 그림자(0 4 26 18%)는 토큰이 없어 가장 가까운 navi-bar 그림자 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={current.image}
          alt=""
          draggable={false}
          className="min-h-0 w-58.25 max-w-full flex-1 object-contain object-top drop-shadow-(--shadow-navi-bar)"
        />
      </div>
    </PageShell>
  );
}
