'use client';

import { Button, GraphicGlobeIcon, GraphicLockIcon } from '@app/design-system';
import { LabeledTextField, PageHeader, VisibilityOption } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import {
  BUNCH_NAME_INVALID_MESSAGE,
  BUNCH_NAME_MAX_LENGTH,
  hasInvalidBunchNameChars,
} from '@/shared/lib/bunchProfile';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';

export function BunchBasicInfo() {
  const router = useRouter();
  const { name, setName, visibility, setVisibility } = useCreateBunchDraft();
  const [composing, setComposing] = useState(false);

  const invalid = hasInvalidBunchNameChars(name, composing);
  const canGoNext = name.length > 0 && !invalid && visibility !== null;

  return (
    <PageShell
      bottom={
        <div className="pt-s5 px-padding-p8">
          <Button
            className="w-full"
            disabled={!canGoNext}
            onClick={() => router.push(ONBOARDING_PATHS.createBunchDescription)}
          >
            다음
          </Button>
        </div>
      }
    >
      <PageHeader
        title="어떤 번치를 만들까요?"
        className="pt-s13 animate-step-title-in motion-reduce:animate-none"
      />
      <div className="pt-s15 px-padding-p8">
        <LabeledTextField
          title="번치 이름"
          placeholder="번치 이름을 입력해주세요"
          value={name}
          maxLength={BUNCH_NAME_MAX_LENGTH}
          errorMessage={invalid ? BUNCH_NAME_INVALID_MESSAGE : undefined}
          onChange={(event) => setName(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
          onBlur={() => setComposing(false)}
        />
      </div>
      {/* fieldset 위쪽 패딩은 legend 아래에 적용되므로 바깥 래퍼로 간격 조정 */}
      <div className="pt-s15 px-padding-p8">
        <fieldset className="min-w-0">
          <legend className="typography-body-3-semi-bold text-text-primary pb-s6">공개 범위</legend>
          <div className="gap-s4 flex flex-col">
            <VisibilityOption
              name="visibility"
              value="private"
              title="비공개 번치"
              description="승인된 팔로워만 번치의 기록을 볼 수 있어요."
              icon={<GraphicLockIcon />}
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />
            <VisibilityOption
              name="visibility"
              value="public"
              title="공개 번치"
              description="누구나 번치의 기록을 볼 수 있어요."
              icon={<GraphicGlobeIcon />}
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />
          </div>
        </fieldset>
      </div>
    </PageShell>
  );
}
