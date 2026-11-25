'use client';

import { Button, Header } from '@app/design-system';
import { RadioCard } from '@app/design-system/web';
import { type RefObject, useId, useState } from 'react';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { FEED_MESSAGES as text } from '../../constants/messages';

/** 다시 시도 안내, 권한을 알기 전 기다림, 볼 수 없음 안내, 고르기 */
export type BundleVisibilityState = 'failed' | 'loading' | 'unavailable' | 'ready';

type BundleVisibilityScreenProps = {
  state: BundleVisibilityState;
  /** 비공개 번치면 「전체 공개」 대신 「일부 공개」(팔로워도 봄) */
  bunchPrivate: boolean;
  /** 저장된 값이 멤버 공개인지 */
  savedMemberOnly: boolean;
  saving: boolean;
  /** 다시 시도·권한 변경 뒤 초점을 받을 제목(컨테이너가 초점을 옮김) */
  titleRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onRetry: () => void;
  onSave: (_memberOnly: boolean) => void;
};

/**
 * 번들 공개 범위 설정(Figma `5367:151676`·`5367:151697`): 전체(비공개 번치는 일부)·멤버 공개 중 하나를 골라 「수정하기」
 * 바뀐 값이 없으면 버튼이 꺼져 있음
 */
export function BundleVisibilityScreen({
  state,
  bunchPrivate,
  savedMemberOnly,
  saving,
  titleRef,
  onBack,
  onRetry,
  onSave,
}: BundleVisibilityScreenProps) {
  const titleId = useId();
  const [picked, setPicked] = useState<boolean | null>(null);
  const memberOnly = picked ?? savedMemberOnly;
  const changed = memberOnly !== savedMemberOnly;

  const options = [
    {
      memberOnly: false,
      title: bunchPrivate ? text.visibilityPartial : text.visibilityAll,
      description: bunchPrivate ? text.visibilityPartialDescription : text.visibilityAllDescription,
    },
    {
      memberOnly: true,
      title: text.visibilityMembers,
      description: text.visibilityMembersDescription,
    },
  ];

  const header = <Header leading={<HeaderBackButton onClick={onBack} />} />;

  if (state === 'failed') {
    return (
      <PageShell header={header}>
        <div className="gap-s8 flex h-full flex-col items-center justify-center">
          <div role="alert">
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="typography-body-2-regular text-text-quinary text-center"
            >
              {text.actionFailed}
            </h1>
          </div>
          <Button variant="tertiary" size="md" onClick={onRetry}>
            {text.retry}
          </Button>
        </div>
      </PageShell>
    );
  }
  // 권한을 알기 전에는 기다림(덮개가 헤더까지 덮음, 앱 공통)
  if (state === 'loading') {
    return (
      <PageShell header={header}>
        <p role="status" className="sr-only">
          {text.bundleLoading}
        </p>
        <PageLoading />
      </PageShell>
    );
  }
  if (state === 'unavailable') {
    return (
      <PageShell header={header}>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="typography-body-2-regular text-text-quinary flex h-full items-center justify-center"
        >
          {text.bundleUnavailable}
        </h1>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={header}
      bottom={
        // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
        <div className="bg-surface-primary pt-padding-p7 px-padding-p8 pb-s4">
          <Button
            className="w-full"
            disabled={!changed || saving}
            onClick={() => onSave(memberOnly)}
          >
            {text.edit}
          </Button>
        </div>
      }
    >
      <h1
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="typography-title-1-semi-bold text-text-primary px-s8 pt-s8"
      >
        {text.visibilityTitle}
      </h1>
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        className="gap-s4 px-padding-p8 pt-s8 flex flex-col"
      >
        {options.map((option) => (
          <RadioCard
            key={String(option.memberOnly)}
            name="bundle-visibility"
            value={option.memberOnly ? 'members' : 'public'}
            title={option.title}
            description={option.description}
            checked={memberOnly === option.memberOnly}
            onChange={() => setPicked(option.memberOnly)}
          />
        ))}
      </div>
    </PageShell>
  );
}
