'use client';

import { Button, cn, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { FollowListItem } from '@app/design-system/web';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { FollowDecision, FollowRequestRow } from '../../model/follows';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type DecisionResult = { applied: boolean; state: 'APPROVED' | 'REJECTED' | 'UNAVAILABLE' };

type FollowRequestsScreenProps = {
  /** 첫 hydration에 내 번치를 아직 모르면 undefined(목록을 그리지 않음) */
  requests: readonly FollowRequestRow[] | undefined;
  onBack: () => void;
  /** 승인·거절. 끝나면 그 행이 목록에서 빠짐, 실패하면 reject(안내는 부르는 쪽) */
  onDecide: (_requestId: string, _decision: FollowDecision) => Promise<DecisionResult>;
};

/**
 * 대기 중인 팔로우 요청(화면설계서 2500:72664 2~4번, Figma 2500:73508)
 * 승인·거절은 확인 없이 바로 처리하고, 서버 처리가 끝나면 목록에서 빼며 토스트로 알림
 */
export function FollowRequestsScreen({ requests, onBack, onDecide }: FollowRequestsScreenProps) {
  // 처리한 행의 버튼이 사라지므로 초점은 개수 줄로
  const countRef = useRef<HTMLParagraphElement>(null);

  // 처리 중인 요청(다시 눌러도 보내지 않음)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  // 처리가 끝나 행이 빠지면 줄어든 개수가 그려진 뒤 개수 줄로 초점(다른 곳으로 옮긴 초점은 가져오지 않음)
  const focusCount = useRef(false);
  const count = requests?.length;
  useEffect(() => {
    if (!focusCount.current) return;
    focusCount.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) countRef.current?.focus();
  }, [count]);

  const decide = async (
    event: MouseEvent<HTMLButtonElement>,
    request: FollowRequestRow,
    decision: FollowDecision,
  ) => {
    if (pendingIds.has(request.requestId)) return;
    const row = event.currentTarget.closest('li');
    setPendingIds((ids) => new Set(ids).add(request.requestId));
    try {
      const result = await onDecide(request.requestId, decision);
      // 처리한 행에 초점이 있었으면(행이 빠지며 초점을 잃음) 개수 줄로
      const active = document.activeElement;
      focusCount.current = !active || active === document.body || !!row?.contains(active);
      // 행이 이미 빠져 다시 그려졌으면 바로 옮김
      if (focusCount.current && !row?.isConnected) {
        focusCount.current = false;
        countRef.current?.focus();
      }
      // 다른 멤버가 먼저 처리했으면 그 결과를 알리고, 요청이 취소·삭제됐으면 조용히 행만 뺌(기능명세 5.11.2)
      if (!result.applied) {
        if (result.state !== 'UNAVAILABLE') toast(BUNCH_HOME_MESSAGES.requestAlreadyHandled);
        return;
      }
      toast(
        decision === 'APPROVE'
          ? BUNCH_HOME_MESSAGES.requestApproved(request.name)
          : BUNCH_HOME_MESSAGES.requestRejected(request.name),
      );
    } catch {
      // 실패 안내는 mutation 공통 토스트(meta)
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(request.requestId);
        return next;
      });
    }
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">팔로우 요청</h1>
      {requests ? (
        // 헤더 아래 12, 개수 줄과 목록 사이 12(Figma 2500:73508)
        <div className="pt-s6 px-padding-p8 pb-s8 gap-s6 flex flex-col">
          {/* Figma Label(화살표 없음): 회색 줄, 누를 수 없음 */}
          <p
            ref={countRef}
            tabIndex={-1}
            className="bg-surface-secondary rounded-r4 px-padding-p8 py-padding-p7 typography-label-s text-text-tertiary focus:outline-none"
          >
            {BUNCH_HOME_MESSAGES.pendingRequests(requests.length)}
          </p>
          {requests.length > 0 ? (
            <ul className="flex flex-col">
              {requests.map((request) => {
                const busy = pendingIds.has(request.requestId);
                return (
                  <li key={request.requestId}>
                    <FollowListItem
                      name={request.name}
                      imageSrc={request.imageSrc}
                      isPrivate={request.isPrivate}
                      privateLabel="비공개 번치"
                      meta={`${request.daysAgo}일 전`}
                      action={
                        <>
                          <Button
                            size="sm"
                            aria-label={`${request.name} 팔로우 요청 승인`}
                            aria-disabled={busy || undefined}
                            className={cn('transition-opacity', busy && 'opacity-60')}
                            onClick={(event) => void decide(event, request, 'APPROVE')}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="secondarySubtle"
                            aria-label={`${request.name} 팔로우 요청 거절`}
                            aria-disabled={busy || undefined}
                            className={cn('transition-opacity', busy && 'opacity-60')}
                            onClick={(event) => void decide(event, request, 'REJECT')}
                          >
                            거절
                          </Button>
                        </>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="typography-body-3-regular text-text-tertiary py-s10 text-center">
              {BUNCH_HOME_MESSAGES.requestsEmpty}
            </p>
          )}
        </div>
      ) : (
        <>
          <p role="status" className="sr-only">
            {BUNCH_HOME_MESSAGES.followListLoading}
          </p>
          <PageLoading />
        </>
      )}
    </PageShell>
  );
}
