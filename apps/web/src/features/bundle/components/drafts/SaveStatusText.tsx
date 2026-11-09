'use client';

import { useEffect, useState } from 'react';
import type { SaveStatus } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

// 점이 0개 → 1개 → 2개 → 0개로 600ms마다 바뀜(Figma 화면 설계서 「저장 중」 Interaction)
const DOT_INTERVAL_MS = 600;
const DOT_STATES = ['', '.', '..'] as const;
// Figma 헤더 저장 상태는 18/27 SemiBold(자간 -0.5, Heading-2-Semibold)
const TEXT_STYLE = 'typography-heading-2-semibold';

/**
 * 헤더의 저장 상태: 「저장 완료」, 저장 중에는 「저장 중」 뒤에 점이 차례로 나타남
 * 점 자리를 미리 잡아 두어 글자 위치가 흔들리지 않고, 동작 줄이기에서는 점을 움직이지 않음(「저장 중」만 보임)
 */
export function SaveStatusText({ status }: { status: SaveStatus }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (status !== 'saving') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(
      () => setStep((current) => (current + 1) % DOT_STATES.length),
      DOT_INTERVAL_MS,
    );
    return () => {
      clearInterval(timer);
      setStep(0);
    };
  }, [status]);

  if (status === 'failed') {
    return (
      <span role="status" className={TEXT_STYLE}>
        {BUNDLE_MESSAGES.headerSaveFailed}
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span role="status" className={TEXT_STYLE}>
        {BUNDLE_MESSAGES.headerSaved}
      </span>
    );
  }

  return (
    <span role="status" className={TEXT_STYLE}>
      {BUNDLE_MESSAGES.headerSaving}
      <span aria-hidden="true" className="inline-block w-[1.5em] text-left">
        {DOT_STATES[step]}
      </span>
    </span>
  );
}
