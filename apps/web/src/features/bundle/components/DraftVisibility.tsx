'use client';

import { LineAlertMediumIcon } from '@app/design-system';
import { BundleTitle, RadioCard } from '@app/design-system/web';
import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import type { DraftVisibility as Visibility } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';

type DraftVisibilityProps = {
  value: Visibility;
  /** 고를 수 있는지(참여 멤버만) */
  editable: boolean;
  onChange: (_value: Visibility) => void;
  /** 고를 수 없는 사람이 눌렀을 때 */
  onDenied: () => void;
};

const OPTIONS: readonly { value: Visibility; label: string }[] = [
  { value: 'members', label: BUNDLE_MESSAGES.visibilityMembers },
  { value: 'public', label: BUNDLE_MESSAGES.visibilityPublic },
];

/**
 * 공개 범위: 「멤버 공개」·「공개」 중 하나(항상 하나가 골라져 있고 해제할 수 없음)
 * 제목 옆 안내 아이콘을 누르면 「공개」의 의미를 알려 주는 툴팁(Figma `2255:43328`)이 아이콘 위에 열리고,
 * 아이콘을 다시 누르거나 바깥을 누르거나 Esc를 누르면 닫힘
 */
export function DraftVisibility({ value, editable, onChange, onDenied }: DraftVisibilityProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipId = useId();
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tooltipOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!helpRef.current?.contains(event.target as Node)) setTooltipOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTooltipOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [tooltipOpen]);

  return (
    <section className="pt-s15 px-padding-p8 gap-s3 flex flex-col">
      <div className="gap-s3 flex items-center">
        <BundleTitle
          title={BUNDLE_MESSAGES.visibilityTitle}
          titleId="draft-visibility-title"
          icon={false}
          required
          className="min-w-0 flex-1"
        />
        <div
          ref={helpRef}
          className="relative shrink-0"
          onBlur={(event) => {
            if (!helpRef.current?.contains(event.relatedTarget)) setTooltipOpen(false);
          }}
        >
          <button
            type="button"
            aria-label={BUNDLE_MESSAGES.visibilityHelp}
            aria-describedby={tooltipId}
            onClick={() => setTooltipOpen((open) => !open)}
            // 보이는 20px보다 넓은 36px 터치 영역(음수 margin으로 배치는 유지)
            className="text-icon-quaternary focus-visible:outline-border-brand -m-s4 p-s4 flex cursor-pointer touch-manipulation items-center justify-center rounded-full focus-visible:outline-2"
          >
            <LineAlertMediumIcon aria-hidden="true" />
          </button>
          {/* 닫혀 있어도 본문을 DOM에 두어 버튼의 설명(aria-describedby)으로 항상 읽히게 하고, 화면에는 열렸을 때만 보임 */}
          {/* 아이콘 위 약 19px, 오른쪽 끝은 아이콘보다 8px 안쪽(Figma 배치) */}
          <div
            id={tooltipId}
            role="tooltip"
            hidden={!tooltipOpen}
            className="right-s4 absolute bottom-[calc(100%+19px)] z-10 w-69.75 max-w-[calc(100dvw-32px)]"
          >
            <div className="flex flex-col items-end">
              <p className="typography-caption-1-medium bg-surface-inversed/60 text-text-inversed rounded-r6 px-padding-p8 py-s4 -mb-3 flex min-h-9 w-full items-center backdrop-blur-[2px]">
                {BUNDLE_MESSAGES.visibilityTooltip}
              </p>
              <Image
                src="/images/tooltip-tail.svg"
                alt=""
                width={14}
                height={17}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
      <div role="radiogroup" aria-labelledby="draft-visibility-title" className="gap-s4 flex">
        {OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            name="draft-visibility"
            value={option.value}
            checked={value === option.value}
            onChange={() => (editable ? onChange(option.value) : onDenied())}
          >
            {option.label}
          </RadioCard>
        ))}
      </div>
    </section>
  );
}
