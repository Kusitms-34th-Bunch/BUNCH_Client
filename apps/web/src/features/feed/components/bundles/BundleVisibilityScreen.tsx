'use client';

import { isApiError } from '@app/api-core';
import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
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
import { useFeedViewer } from '../../hooks/useFeedViewer';
import {
  managedBundleQueryOptions,
  useSavePublishedVisibilityMutation,
} from '../../queries/manageBundle';

type BundleVisibilityScreenProps = {
  bunchId: string;
  bundleId: string;
  /** 비공개 번치면 「전체 공개」 대신 「일부 공개」(팔로워도 봄). route가 번치 정보를 읽어 넘김 */
  bunchPrivate: boolean;
};

/**
 * 번들 공개 범위 설정(Figma `5367:151676`·`5367:151697`): 전체(비공개 번치는 일부)·멤버 공개 중 하나를 골라 「수정하기」
 * 현재 값·버전·권한은 우리 번치 번들 조회(멤버 공개도 옴), 저장은 명세 057. 바뀐 값이 없으면 버튼이 꺼져 있고, 저장하면 상세로 돌아감
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
  const detail = useQuery(managedBundleQueryOptions(bunchId, bundleId, viewerId));
  const save = useSavePublishedVisibilityMutation();
  // 메뉴를 숨기는 것만으로는 막히지 않아 직접 들어와도 서버가 수정 권한을 준 사람만, 발행본만 바꿈
  // 권한을 잃은 뒤 다시 받기가 403·404면 받아 둔 값이 있어도 볼 수 없다는 안내로
  const lost = isApiError(detail.error) && [403, 404].includes(detail.error.status ?? 0);
  const canEdit = !lost && detail.data?.status === 'PUBLISHED' && detail.data.permissions.canEdit;
  const saved = detail.data?.visibility === 'PRIVATE';
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

  // 저장 실패(6.2.15 로직): 권한을 잃었으면 알리고 다시 받아 볼 수 없다는 안내로, 그사이 지워졌으면 피드로
  // 다른 곳에서 먼저 바꿔 버전이 어긋나면(BUNDLE_003) 최신 값을 다시 받고 고른 값은 둠
  const failSave = (error: unknown) => {
    const code = isApiError(error) ? error.code : undefined;
    if (code === 'RESOURCE_001') {
      backOr(FEED_PATHS.home);
      toastAfterNavigation(text.bundleGone);
      return;
    }
    if (code === 'AUTH_002') {
      toast(text.permissionChanged);
      // 다시 받아 안내로 바뀌면 사라진 「수정하기」 대신 안내 제목으로 초점
      focusTitleAfterRetry.current = true;
      void detail.refetch();
      return;
    }
    if (code === 'BUNDLE_003') void detail.refetch();
    toast(text.actionFailed);
  };

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
            disabled={!changed || save.isPending}
            onClick={() => {
              if (!detail.data || viewerId === undefined) return;
              save.mutate(
                {
                  bunchId,
                  bundleId,
                  viewerId,
                  value: memberOnly ? 'PRIVATE' : 'PUBLIC',
                  expectedVersion: detail.data.visibilityVersion,
                },
                {
                  onSuccess: () => {
                    back();
                    toastAfterNavigation(text.visibilitySaved);
                  },
                  onError: failSave,
                },
              );
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
