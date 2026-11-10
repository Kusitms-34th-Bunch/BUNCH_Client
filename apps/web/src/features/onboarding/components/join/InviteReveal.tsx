'use client';

import { cn } from '@app/design-system';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CharacterType } from '@/shared/lib/bunchProfile';
import {
  INVITE_REVEAL_CARD_READY,
  INVITE_REVEAL_COLORS,
  INVITE_REVEAL_DURATION_MS,
  INVITE_REVEAL_GLINTS,
} from '../../constants/inviteReveal';
import {
  cardKeyframes,
  envelopeKeyframes,
  glintKeyframes,
  sealKeyframes,
  titleKeyframes,
} from '../../lib/inviteRevealKeyframes';

type InviteRevealProps = {
  /** 초대받은 번치의 타입. 봉투·인장 색을 정함 */
  characterType: CharacterType;
  title: ReactNode;
  /** 펼쳐질 초대 카드 */
  children: ReactNode;
};

const OPTIONS = { duration: INVITE_REVEAL_DURATION_MS, fill: 'both' } as const;

/**
 * 초대장 열람 모션(Figma `Seal & Flip`): 봉투가 올라오고 인장이 흩어진 뒤 봉투가 접히며 카드가 펼쳐지고 제목이 나타남
 * 동작 줄이기이거나 재생을 지원하지 않으면 모션 없이 최종 화면을 바로 보여 줌
 */
export function InviteReveal({ characterType, title, children }: InviteRevealProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLSpanElement>(null);
  const glintRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // pending: 서버·첫 렌더, playing: 재생 중, static: 모션 없음
  const [mode, setMode] = useState<'pending' | 'playing' | 'static'>('pending');
  const [ready, setReady] = useState(false);

  // 첫 페인트 전에 재생을 시작해 완성된 화면이 잠깐 보이지 않게 함
  useLayoutEffect(() => {
    const title = titleRef.current;
    const card = cardRef.current;
    const envelope = envelopeRef.current;
    const seal = sealRef.current;
    if (
      !title ||
      !card ||
      !envelope ||
      !seal ||
      typeof card.animate !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setMode('static');
      return;
    }

    setMode('playing');
    const animations = [
      title.animate(titleKeyframes.opacity, OPTIONS),
      title.animate(titleKeyframes.translate, OPTIONS),
      card.animate(cardKeyframes.opacity, OPTIONS),
      card.animate(cardKeyframes.scale, OPTIONS),
      envelope.animate(envelopeKeyframes.opacity, OPTIONS),
      envelope.animate(envelopeKeyframes.translate, OPTIONS),
      envelope.animate(envelopeKeyframes.scale, OPTIONS),
      seal.animate(sealKeyframes, OPTIONS),
      ...INVITE_REVEAL_GLINTS.flatMap((glint, index) => {
        const element = glintRefs.current[index];
        if (!element) return [];
        const keyframes = glintKeyframes(glint);
        return [
          element.animate(keyframes.opacity, OPTIONS),
          // 가운데 조각은 움직이지 않고 사라지기만 함
          ...(glint.dx === 0 && glint.dy === 0
            ? []
            : [element.animate(keyframes.translate, OPTIONS)]),
        ];
      }),
    ];
    // 카드가 다 펼쳐지기 전에는 눌리거나 읽히지 않게 둠
    const timer = setTimeout(
      () => setReady(true),
      INVITE_REVEAL_DURATION_MS * INVITE_REVEAL_CARD_READY,
    );

    return () => {
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  // 재생 전·중에는 CSS로 숨겨 두고 재생이 인계(fill)하며, 모션이 없으면 바로 보임
  const hidden = mode === 'static' ? undefined : 'motion-safe:opacity-0';
  const color = INVITE_REVEAL_COLORS[characterType];

  return (
    <>
      <div ref={titleRef} className={cn('w-full', hidden)}>
        {title}
      </div>
      <div className="relative w-full">
        <div ref={cardRef} inert={mode !== 'static' && !ready} className={hidden}>
          {children}
        </div>
        {mode === 'static' ? null : (
          <div
            ref={envelopeRef}
            aria-hidden="true"
            className="rounded-r8 pointer-events-none absolute inset-0 flex items-center justify-center opacity-0"
            style={{ backgroundColor: color }}
          >
            <div className="relative size-28">
              <span ref={sealRef} className="absolute inset-0 rounded-full bg-white" />
              {/* 인장 가운데 70×70 칸에 10px 조각 */}
              <div className="absolute top-5.25 left-5.25 size-17.5">
                {INVITE_REVEAL_GLINTS.map((glint, index) => (
                  <span
                    key={glint.id}
                    ref={(element) => {
                      glintRefs.current[index] = element;
                    }}
                    className="absolute size-2.5"
                    style={{ left: glint.left, top: glint.top, backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
