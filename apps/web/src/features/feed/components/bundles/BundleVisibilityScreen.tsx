'use client';

import { isApiError } from '@app/api-core';
import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { DescriptionRadioCard } from '@app/design-system/web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { useBundleEdits } from '../../hooks/useBundleEdits';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { bundleEdits } from '../../lib/bundleEdits';
import { bundleDetailQueryOptions } from '../../queries/bundleDetail';

type BundleVisibilityScreenProps = {
  bunchId: string;
  bundleId: string;
  /** 비공개 번치면 「전체 공개」 대신 「일부 공개」(팔로워도 봄). route가 번치 정보를 읽어 넘김 */
  bunchPrivate: boolean;
};

/**
 * 번들 공개 범위 설정(Figma `5367:151676`·`5367:151697`): 전체(비공개 번치는 일부)·멤버 공개 중 하나를 골라 「수정하기」
 * 현재 값과 권한은 발행 번들 상세(명세 084), 저장은 화면에서만(API 연동 6번). 바뀐 값이 없으면 버튼이 꺼져 있고, 저장하면 상세로 돌아감
 */
export function BundleVisibilityScreen({
  bunchId,
  bundleId,
  bunchPrivate,
}: BundleVisibilityScreenProps) {
  const backOr = useBackOr();
  const titleId = useId();
  const { viewer, viewerFailed, viewerFetching, retryViewer } = useFeedViewer();
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const detail = useQuery(bundleDetailQueryOptions(bunchId, bundleId, viewerId));
  const { isDeleted, memberOnlyOf } = useBundleEdits();
  // 메뉴를 숨기는 것만으로는 막히지 않아 직접 들어와도 서버가 수정 권한을 준 사람만 바꿈
  const canEdit = !isDeleted(bundleId) && detail.data?.permissions.canEdit === true;
  const saved = memberOnlyOf(bundleId, detail.data?.visibility === 'PRIVATE');
  // ponytail: 저장은 화면에서만, 공개 범위 API 연결(API 연동 6번) 때 서버로 보냄
  // 외부 상세(084)는 멤버 공개 번들을 404로 빼므로 서버에 멤버 공개로 저장되면 이 화면에 다시 못 들어옴. 6번에서 관리용 조회로
  const [picked, setPicked] = useState<boolean | null>(null);
  const memberOnly = picked ?? saved;
  const changed = memberOnly !== saved;
  const back = () => backOr(FEED_PATHS.bundle(bunchId, bundleId));
  // 「다시 시도」가 끝나 버튼이 사라지면 그 화면의 제목(설정 제목이나 볼 수 없음 안내)으로 초점
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleAfterRetry = useRef(false);
  useEffect(() => {
    if (!focusTitleAfterRetry.current || detail.isFetching || viewerFetching) return;
    focusTitleAfterRetry.current = false;
    // 다시 실패해 버튼이 남았으면 초점도 그대로
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    titleRef.current?.focus({ preventScroll: true });
  });

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

  // 일시 오류(400·403·404 외)와 내 정보 실패는 다시 시도, 권한이 없거나 없는·지운 번들은 볼 수 없다는 안내
  // 이미 받은 상세가 있으면 다시 받기가 실패해도 고르던 화면을 그대로 둠
  const failed =
    !detail.data &&
    ((detail.isError &&
      !(isApiError(detail.error) && [400, 403, 404].includes(detail.error.status ?? 0))) ||
      (viewer === undefined && viewerFailed));
  if (failed) {
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
          <Button
            variant="tertiary"
            size="md"
            onClick={() => {
              focusTitleAfterRetry.current = true;
              void (detail.isError ? detail.refetch() : retryViewer());
            }}
          >
            {text.retry}
          </Button>
        </div>
      </PageShell>
    );
  }
  // 권한을 알기 전에는 기다림(덮개가 헤더까지 덮음, 앱 공통)
  if (detail.isPending) {
    return (
      <PageShell header={header}>
        <p role="status" className="sr-only">
          {text.bundleLoading}
        </p>
        <PageLoading />
      </PageShell>
    );
  }
  if (!canEdit) {
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
          <DescriptionRadioCard
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
