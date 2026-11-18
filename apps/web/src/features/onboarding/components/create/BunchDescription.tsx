'use client';

import { Badge, Button, toast } from '@app/design-system';
import { LabeledTextArea, PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { prohibitedFieldsOf } from '@/shared/api/prohibitedWord';
import { PageShell } from '@/shared/components/layout/PageShell';
import {
  BUNCH_DESCRIPTION_MAX_LENGTH,
  BUNCH_DESCRIPTION_PROHIBITED_MESSAGE,
} from '@/shared/lib/bunchProfile';
import { ONBOARDING_MESSAGES } from '../../constants/messages';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';
import { useValidateIntroductionMutation } from '../../queries/bunches';

const TIPS = [
  '만나면 웃음이 끊이지 않는 우리',
  '맛집 탐방에 진심인 사람들',
  '소소한 일상도 특별하게 기록하는 사이',
];

/**
 * 번치 만들기 2단계: 한 줄 소개(필수, 50자)
 * 「다음」을 누르면 서버가 금칙어를 먼저 검사하고 통과한 입력만 3단계로 넘어감(기능명세 2.2.6 로직 4)
 * 검사 중에는 「다음」만 잠금(짧은 검사라 화면 전체 로딩은 쓰지 않음, 사용자 결정 2026-11-18)
 * 금칙어면 입력란 아래 안내, 고치면 안내를 지움. 그 밖의 실패는 토스트 후 머물러 다시 누를 수 있음
 */
export function BunchDescription() {
  const router = useRouter();
  const { description, setDescription } = useCreateBunchDraft();
  const validate = useValidateIntroductionMutation();
  // 서버가 금칙어로 거부한 소개(그 값 그대로일 때만 안내)
  const [prohibitedValue, setProhibitedValue] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 검사를 보낸 뒤 입력이 바뀌었으면 그 응답은 버림(최신 입력만 이동)
  const latest = useRef(description);
  // 같은 순간의 두 번째 탭은 ref로 막음(isPending은 다음 렌더부터 반영)
  const validating = useRef(false);
  useEffect(() => {
    latest.current = description;
  });
  const prohibited = prohibitedValue !== null && prohibitedValue === description;
  const canGoNext = description.trim().length > 0 && !prohibited && !validate.isPending;
  const ready = useCreateBunchGuard(1);
  if (!ready) return null;

  const goNext = () => {
    if (!canGoNext || validating.current) return;
    validating.current = true;
    const value = description;
    validate.mutate(value, {
      onSettled: () => {
        validating.current = false;
      },
      onSuccess: () => {
        if (latest.current === value) router.push(ONBOARDING_PATHS.createBunchMood);
      },
      onError: (error) => {
        if (latest.current !== value) return;
        if (prohibitedFieldsOf(error)?.includes('introduction')) {
          // 오류 표시를 먼저 반영해 초점이 갈 때 오류 상태로 읽히게 함
          flushSync(() => setProhibitedValue(value));
          // 「다음」이 비활성이 되므로 안내가 붙은 입력란으로 초점을 옮겨 바로 고칠 수 있게 함
          containerRef.current?.querySelector('textarea')?.focus();
          return;
        }
        toast(ONBOARDING_MESSAGES.temporaryFailure);
      },
    });
  };

  return (
    <PageShell
      bottom={
        <div className="gap-s5 pt-s5 px-padding-p8 flex">
          <Button variant="secondary" className="w-22 shrink-0" onClick={() => router.back()}>
            이전
          </Button>
          <Button
            className="flex-1"
            disabled={!canGoNext}
            aria-busy={validate.isPending || undefined}
            onClick={goNext}
          >
            다음
          </Button>
        </div>
      }
    >
      <PageHeader
        title="번치를 소개해주세요"
        className="pt-s13 animate-step-title-in motion-reduce:animate-none"
      />
      <div ref={containerRef} className="pt-s15 px-padding-p8">
        <LabeledTextArea
          label="한 줄 소개"
          placeholder="우리 번치를 간단하게 소개해주세요"
          value={description}
          maxLength={BUNCH_DESCRIPTION_MAX_LENGTH}
          error={prohibited ? BUNCH_DESCRIPTION_PROHIBITED_MESSAGE : undefined}
          onChange={(event) => setDescription(event.target.value.replace(/[\r\n]+/g, ' '))}
          // 한 줄 소개의 Enter 줄바꿈 방지(붙여넣은 줄바꿈은 공백 처리)
          enterKeyHint="done"
          onKeyDown={(event) => {
            // 한글 조합 확정 Enter 허용
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
          }}
        />
      </div>
      <section className="pt-s15 px-padding-p8 gap-s3 flex flex-col">
        <div className="gap-s3 flex items-center">
          <Badge size="sm">TIP</Badge>
          <h2 className="typography-body-3-semibold text-text-primary">이런 소개는 어때요?</h2>
        </div>
        {/* 토큰이 없는 목록 들여쓰기에 Figma 값 19.5px 적용 */}
        {/* Safari에서 list-style none인 ul의 목록 인식 누락 방지 */}
        <ul className="bg-surface-secondary rounded-r4 p-s8 gap-s2 typography-body-4-regular text-text-tertiary flex list-disc flex-col">
          {TIPS.map((tip) => (
            <li key={tip} className="ms-[19.5px]">
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
