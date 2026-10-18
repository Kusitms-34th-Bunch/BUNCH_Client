'use client';

import { Button, GraphicGlobeIcon, GraphicLockIcon, LabeledTextField } from '@app/design-system';
import { PageHeader, VisibilityOption } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../constants/paths';
import { useCreateBunchDraft } from '../model/createBunchDraftContext';

const NAME_MAX_LENGTH = 12;
const NAME_PATTERN = /^[A-Za-z0-9가-힣]*$/;
// 한글 IME는 조합 중 자모(ㅎ 등)를 값에 넣으므로 조합 중에는 자모도 허용해 오류 깜빡임 방지
const COMPOSING_NAME_PATTERN = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]*$/;

/**
 * 번치 만들기 첫 단계: 번치 이름과 공개 범위를 정하는 화면
 * 입력값은 단계 사이에 유지되도록 create layout의 임시 상태에 보관
 */
export function BunchBasicInfo() {
  const router = useRouter();
  const { name, setName, visibility, setVisibility } = useCreateBunchDraft();
  const [composing, setComposing] = useState(false);

  const invalid = !(composing ? COMPOSING_NAME_PATTERN : NAME_PATTERN).test(name);
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
      <PageHeader title="어떤 번치를 만들까요?" className="pt-s13" />
      <div className="pt-s15 px-padding-p8">
        <LabeledTextField
          label="번치 이름"
          placeholder="번치 이름을 입력해주세요"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          error={invalid ? '특수문자를 제외한 영문, 한글만 사용할 수 있어요.' : undefined}
          onChange={(event) => setName(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          // 일부 모바일 키보드는 조합 종료 없이 포커스가 빠져 조합 중 상태가 남음
          onBlur={() => setComposing(false)}
        />
      </div>
      {/* fieldset의 위쪽 패딩은 legend 아래에 적용돼서 바깥 래퍼로 간격을 둠 */}
      <div className="pt-s15 px-padding-p8">
        <fieldset className="min-w-0">
          <legend className="typography-body-2-meduim text-text-primary pb-s6">공개 범위</legend>
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
