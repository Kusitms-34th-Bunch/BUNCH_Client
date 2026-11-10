'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { DescriptionRadioCard } from '@app/design-system/web';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { getBundleDetailFixture } from '../../fixtures/bundleDetail.fixture';
import { useBundleEdits } from '../../hooks/useBundleEdits';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { bundleEdits } from '../../lib/bundleEdits';

type BundleVisibilityScreenProps = {
  bundleId: string;
  /** 비공개 번치면 「전체 공개」 대신 「일부 공개」(팔로워도 봄). route가 번치 정보를 읽어 넘김 */
  bunchPrivate: boolean;
};

/**
 * 번들 공개 범위 설정(Figma `5367:151676`·`5367:151697`): 전체(비공개 번치는 일부)·멤버 공개 중 하나를 골라 「수정하기」
 * API 연결 전이라 화면에서만 바뀜(구현 단위 10). 바뀐 값이 없으면 버튼이 꺼져 있고, 저장하면 상세로 돌아감
 */
export function BundleVisibilityScreen({ bundleId, bunchPrivate }: BundleVisibilityScreenProps) {
  const backOr = useBackOr();
  const titleId = useId();
  const { viewer, viewerPending } = useFeedViewer();
  const { isDeleted, memberOnlyOf } = useBundleEdits();
  const bundle = isDeleted(bundleId) ? undefined : getBundleDetailFixture(bundleId);
  // ponytail: 메뉴를 숨기는 것만으로는 막히지 않아 직접 들어와도 메인 관리자만 바꿈. API 연결 때 서버 권한 확인과 notFound()로 옮김
  const canEdit =
    bundle !== undefined && viewer?.bunchId === bundle.bunch.id && bundle.myRole === 'owner';
  const saved = bundle ? memberOnlyOf(bundleId, bundle.memberOnly) : false;
  const [memberOnly, setMemberOnly] = useState(saved);
  const changed = memberOnly !== saved;
  const back = () => backOr(FEED_PATHS.bundle(bundleId));

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

  const header = (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={back}>
          <LineChevronLeftLargeIcon aria-hidden="true" />
        </HeaderIconButton>
      }
    />
  );

  // 내 정보를 받는 동안은 권한을 알 수 없음. 받지 못하면(실패) 아래 안내로 가 뒤로 갈 수 있게 함
  if (viewerPending && bundle) return <PageLoading />;
  if (!canEdit) {
    return (
      <PageShell header={header}>
        <h1 className="typography-body-2-regular text-text-quinary flex h-full items-center justify-center">
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
            disabled={!changed}
            onClick={() => {
              bundleEdits.setMemberOnly(bundleId, memberOnly);
              back();
              toastAfterNavigation(text.bundleEdited);
            }}
          >
            {text.edit}
          </Button>
        </div>
      }
    >
      <h1 id={titleId} className="typography-title-1-semi-bold text-text-primary px-s8 pt-s8">
        {text.visibilityTitle}
      </h1>
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        className="gap-s4 px-padding-p8 pt-s8 flex flex-col"
      >
        {options.map((option) => (
          <DescriptionRadioCard
            key={String(option.memberOnly)}
            name="bundle-visibility"
            value={option.memberOnly ? 'members' : 'public'}
            title={option.title}
            description={option.description}
            checked={memberOnly === option.memberOnly}
            onChange={() => setMemberOnly(option.memberOnly)}
          />
        ))}
      </div>
    </PageShell>
  );
}
