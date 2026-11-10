'use client';

import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { DescriptionRadioCard } from '@app/design-system/web';
import { useId } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { DraftVisibility } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type DraftVisibilityScreenProps = {
  /** 고른 공개 범위. 아직 고르지 않았으면 null */
  value: DraftVisibility | null;
  /** 비공개 번치면 「공개」가 「일부 공개」(팔로워도 볼 수 있음)로 보임 */
  bunchPrivate: boolean;
  /** 업로드 요청을 보내는 중(버튼이 「업로드 중」으로 바뀌고 화면을 막음) */
  uploading: boolean;
  onChange: (_value: DraftVisibility) => void;
  onBack: () => void;
  onUpload: () => void;
};

/**
 * 업로드 직전 공개 범위 화면(Figma `5699:105991`·`106016`·`106041`): 공개 범위 하나를 고르고 「업로드」
 * 공개 범위를 고르기 전에는 「업로드」가 꺼져 있고, 업로드하는 동안은 「업로드 중」으로 바뀌며 화면 전체를 dim 로딩으로 막음
 */
export function DraftVisibilityScreen({
  value,
  bunchPrivate,
  uploading,
  onChange,
  onBack,
  onUpload,
}: DraftVisibilityScreenProps) {
  const titleId = useId();
  // 공개 범위를 고르기 전이거나 업로드 중이면 흐리게 두되 초점을 유지하도록 disabled 대신 aria-disabled
  const blocked = value === null || uploading;
  const options: readonly { value: DraftVisibility; title: string; description: string }[] = [
    bunchPrivate
      ? {
          value: 'public',
          title: BUNDLE_MESSAGES.visibilityPartial,
          description: BUNDLE_MESSAGES.visibilityPartialDescription,
        }
      : {
          value: 'public',
          title: BUNDLE_MESSAGES.visibilityAll,
          description: BUNDLE_MESSAGES.visibilityAllDescription,
        },
    {
      value: 'members',
      title: BUNDLE_MESSAGES.visibilityMembers,
      description: BUNDLE_MESSAGES.visibilityMembersDescription,
    },
  ];

  return (
    <PageShell
      header={
        <div inert={uploading}>
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" onClick={onBack}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
          />
        </div>
      }
      bottom={
        // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
        <div className="bg-surface-primary border-border-tertiary pt-padding-p7 px-padding-p8 pb-s4 border-t">
          <Button
            className="aria-disabled:bg-surface-disabled aria-disabled:text-text-disabled w-full aria-disabled:cursor-not-allowed"
            aria-disabled={blocked ? true : undefined}
            onClick={() => {
              if (uploading) return;
              if (value === null) toast(BUNDLE_MESSAGES.visibilityRequired);
              else onUpload();
            }}
          >
            {uploading ? BUNDLE_MESSAGES.uploading : BUNDLE_MESSAGES.upload}
          </Button>
        </div>
      }
    >
      <h1 id={titleId} className="typography-title-1-semi-bold text-text-primary px-s8 pt-s8">
        {BUNDLE_MESSAGES.visibilityScreenTitle}
      </h1>
      {/* 업로드 상태를 알리는 live region(항상 마운트해 문구만 바꿈) */}
      <p role="status" className="sr-only">
        {uploading ? BUNDLE_MESSAGES.uploading : ''}
      </p>
      {uploading ? <PageLoading /> : null}
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        className="gap-s4 px-padding-p8 pt-s8 flex flex-col"
        inert={uploading}
      >
        {options.map((option) => (
          <DescriptionRadioCard
            key={option.value}
            name="draft-visibility"
            value={option.value}
            title={option.title}
            description={option.description}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
        ))}
      </div>
      <p className="typography-caption-1-regular text-text-quinary px-s8 pt-s6" inert={uploading}>
        {BUNDLE_MESSAGES.visibilityNotice}
      </p>
    </PageShell>
  );
}
