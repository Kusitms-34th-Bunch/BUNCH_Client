'use client';

import { Button } from '@app/design-system';
import { DescriptionRadioCard, LabeledTextField, PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import {
  useNicknameAvailability,
  type CheckNickname,
} from '@/shared/hooks/useNicknameAvailability';
import {
  BUNCH_NAME_CHECKING_MESSAGE,
  BUNCH_NAME_INVALID_MESSAGE,
  BUNCH_NAME_TAKEN_MESSAGE,
  BUNCH_NAME_MAX_LENGTH,
  hasInvalidBunchNameChars,
} from '@/shared/lib/bunchProfile';
import { checkBunchNameAvailability } from '../../api/bunches';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';

type BunchBasicInfoProps = {
  /** 번치 이름 중복 확인 호출. 기본은 서버 확인, 테스트에서 대체하고 null이면 확인하지 않음 */
  checkName?: CheckNickname | null | undefined;
};

/**
 * 번치 만들기 1단계: 이름(1~12자, 입력을 멈추고 0.5초 뒤 중복 확인)과 공개 범위
 * 확인 요청이 실패해도 결과 문구 없이 「다음」을 열고 생성 때 서버가 최종 판단(기획 2.2.3)
 */
export function BunchBasicInfo({ checkName = checkBunchNameAvailability }: BunchBasicInfoProps) {
  const router = useRouter();
  const { name, setName, visibility, setVisibility, takenName } = useCreateBunchDraft();
  const [composing, setComposing] = useState(false);

  const invalid = hasInvalidBunchNameChars(name, composing);
  const normalized = name.normalize('NFC').trim();
  // 규칙에 맞지 않는 이름은 서버에 묻지 않음
  const availability = useNicknameAvailability(
    invalid || composing ? '' : normalized,
    checkName ?? undefined,
    { notifyFailure: false },
  );
  // 서버가 생성 때 이미 쓰는 이름이라고 거절한 이름은 사용 중으로 보되, 그 뒤 확인에서 사용 가능으로 돌아오면(이름이 풀림) 따르지 않음
  const taken =
    availability === 'taken' ||
    (availability !== 'available' && takenName !== null && takenName === normalized);
  const canGoNext =
    normalized.length > 0 &&
    !invalid &&
    visibility !== null &&
    !taken &&
    availability !== 'checking';

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
          errorMessage={
            invalid ? BUNCH_NAME_INVALID_MESSAGE : taken ? BUNCH_NAME_TAKEN_MESSAGE : undefined
          }
          // 중복 확인이 도는 동안만 보이고, 문제가 없으면 사라지며 중복이면 오류 문구가 대신 보임(오류가 있으면 보이지 않음)
          helperMessage={availability === 'checking' ? BUNCH_NAME_CHECKING_MESSAGE : undefined}
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
          <legend className="typography-body-3-semibold text-text-primary pb-s2">공개 범위</legend>
          <div className="gap-s3 flex flex-col">
            <DescriptionRadioCard
              name="visibility"
              value="public"
              title="공개 번치"
              description="누구나 번치의 기록을 볼 수 있어요."
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />
            <DescriptionRadioCard
              name="visibility"
              value="private"
              title="비공개 번치"
              description="승인된 팔로워만 번치의 기록을 볼 수 있어요."
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />
          </div>
        </fieldset>
      </div>
    </PageShell>
  );
}
