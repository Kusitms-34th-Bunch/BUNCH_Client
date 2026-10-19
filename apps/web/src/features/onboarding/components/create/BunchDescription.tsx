'use client';

import { Badge, Button } from '@app/design-system';
import { LabeledTextArea, PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';

const DESCRIPTION_MAX_LENGTH = 50;
const TIPS = [
  '만나면 웃음이 끊이지 않는 우리',
  '맛집 탐방에 진심인 사람들',
  '소소한 일상도 특별하게 기록하는 사이',
];

export function BunchDescription() {
  const router = useRouter();
  const { description, setDescription } = useCreateBunchDraft();
  const canGoNext = description.trim().length > 0;
  const ready = useCreateBunchGuard(1);
  if (!ready) return null;

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
            onClick={() => router.push(ONBOARDING_PATHS.createBunchMood)}
          >
            다음
          </Button>
        </div>
      }
    >
      <PageHeader title="번치를 소개해주세요" className="pt-s13" />
      <div className="pt-s15 px-padding-p8">
        <LabeledTextArea
          label="한 줄 소개"
          placeholder="우리 번치를 간단하게 소개해주세요"
          value={description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDescription(event.target.value.replace(/[\r\n]+/g, ' '))}
          // 한 줄 소개의 Enter 줄바꿈 방지(붙여넣은 줄바꿈은 공백 처리)
          enterKeyHint="done"
          onKeyDown={(event) => {
            // 한글 조합 확정 Enter 허용
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
          }}
        />
      </div>
      <section className="pt-s15 px-padding-p8 gap-s4 flex flex-col">
        <div className="gap-s3 flex items-center">
          <Badge size="sm">TIP</Badge>
          <h2 className="typography-body-2-meduim text-text-primary">이런 소개는 어때요?</h2>
        </div>
        {/* 토큰이 없는 목록 들여쓰기에 Figma 값 19.5px 적용 */}
        {/* Safari에서 list-style none인 ul의 목록 인식 누락 방지 */}
        <ul className="bg-surface-secondary rounded-r4 p-s8 gap-s2 typography-body-3-regular text-text-tertiary flex list-disc flex-col">
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
