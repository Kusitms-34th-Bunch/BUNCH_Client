'use client';

import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { FollowListItem } from '@app/design-system/web';
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { FollowBunch } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';

export type FollowRequestRow = Pick<FollowBunch, 'id' | 'name' | 'imageSrc' | 'isPrivate'> & {
  daysAgo: number;
};

type FollowRequestsScreenProps = {
  /** 첫 hydration에 내 번치를 아직 모르면 undefined(목록을 그리지 않음) */
  requests: readonly FollowRequestRow[] | undefined;
  onBack: () => void;
  onApprove: (_bunchId: string) => void;
  onReject: (_bunchId: string) => void;
};

/**
 * 대기 중인 팔로우 요청(화면설계서 2500:72664 2~4번, Figma 2500:73508)
 * 승인·거절은 확인 없이 바로 처리하고 목록에서 빼며 토스트로 알림
 */
export function FollowRequestsScreen({
  requests,
  onBack,
  onApprove,
  onReject,
}: FollowRequestsScreenProps) {
  // 처리한 행의 버튼이 사라지므로 초점은 개수 줄로
  const countRef = useRef<HTMLParagraphElement>(null);

  const decide = (request: FollowRequestRow, approve: boolean) => {
    // 줄어든 개수가 그려진 뒤 초점을 옮겨 새 개수를 읽게 함
    flushSync(() => (approve ? onApprove(request.id) : onReject(request.id)));
    countRef.current?.focus();
    toast(
      approve
        ? BUNCH_HOME_MESSAGES.requestApproved(request.name)
        : BUNCH_HOME_MESSAGES.requestRejected(request.name),
      { fullWidth: true },
    );
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
              {requests.map((request) => (
                <li key={request.id}>
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
                          onClick={() => decide(request, true)}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="secondarySubtle"
                          aria-label={`${request.name} 팔로우 요청 거절`}
                          onClick={() => decide(request, false)}
                        >
                          거절
                        </Button>
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="typography-body-3-regular text-text-tertiary py-s10 text-center">
              {BUNCH_HOME_MESSAGES.requestsEmpty}
            </p>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
