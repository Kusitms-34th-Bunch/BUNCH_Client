'use client';

import { ActionDialog, Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { ProfileImage, ProfileListItem } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useId, useRef } from 'react';
import blockedListEmpty from '@/shared/assets/images/empty/blocked-list-empty.svg';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BlockedBunch } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type BunchBlockedListScreenProps = {
  /** 차단한 번치(첫 쪽). 아직 모르면 로딩 */
  blocked: readonly BlockedBunch[] | undefined;
  /** 전체 차단 수(목록은 첫 쪽만이라 행 수와 다를 수 있음). 없으면 행 수 */
  total?: number | undefined;
  /** 차단 해제 가능 여부(메인·공동 관리자). 일반 멤버는 목록만 봄 */
  canUnblock: boolean;
  /** 해제. 끝나면 그 행이 목록에서 빠짐, 실패하면 reject(안내는 부르는 쪽) */
  onUnblock: (_target: BlockedBunch) => Promise<unknown>;
  onBack: () => void;
};

/**
 * 번치 차단 목록(기능명세 5.7, 화면설계서 2236:40175): 「차단된 번치 N개」, 차단해제 → 확인 → 토스트, 빈 상태
 */
export function BunchBlockedListScreen({
  blocked,
  total,
  canUnblock,
  onUnblock,
  onBack,
}: BunchBlockedListScreenProps) {
  const openOverlay = useScreenOverlay();
  // 해제한 행이 사라지면 초점을 받는 자리(목록이 비면 빈 상태 제목). 개수 줄과 빈 상태는 동시에 그려지지 않음
  const countRef = useRef<HTMLParagraphElement>(null);
  const emptyRef = useRef<HTMLHeadingElement>(null);
  // 진행 중인 해제(해제마다 새 객체). 행이 빠져 개수가 바뀐 렌더 뒤 초점을 옮기고 토스트(초점 → 토스트 순서)
  const pending = useRef<{ id: string; name: string } | null>(null);
  const count = blocked?.length;
  useEffect(() => {
    const done = pending.current;
    // 그 행이 실제로 빠졌을 때만(다른 해제·다시 받기로 개수가 바뀐 경우는 기다림)
    if (!done || blocked?.some((bunch) => bunch.id === done.id)) return;
    pending.current = null;
    (countRef.current ?? emptyRef.current)?.focus();
    toast(BUNCH_HOME_MESSAGES.unblocked(done.name), { icon: 'success' });
  }, [count, blocked]);
  // Figma 2141:37877: 이미지 + 「해제하기」·「취소」 세로 배치(설계의 「번치에서 내보내기」는 번치 단위 차단과 맞지 않아 뺌)
  const openUnblock = (target: BlockedBunch) => {
    // 해제가 끝나기 전에는 다시 받지 않음(같은 DELETE가 두 번 가면 뒤 요청이 404로 실패 안내를 띄움)
    if (pending.current) return;
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ActionDialog
          {...rootProps}
          image={<ProfileImage src={target.imageSrc} size="M" className="size-14" />}
          title={BUNCH_HOME_MESSAGES.unblockTitle(target.name)}
          description={BUNCH_HOME_MESSAGES.unblockDescription}
          actions={[
            {
              label: '해제하기',
              onClick: () => {
                confirmed = true;
                close();
              },
            },
          ]}
        />
      ),
      // 확인 창이 다 닫힌 뒤 해제(실패 안내가 닫히는 창 뒤에 묻히지 않게). 끝나면 행이 빠진 화면이 그려진 다음
      // 사라진 「차단해제」 대신 개수 줄(목록이 비면 빈 상태 제목)로 초점을 옮기고 토스트, 실패 안내는 부르는 쪽
      () => {
        if (!confirmed || pending.current) return;
        const request = { id: target.id, name: target.name };
        pending.current = request;
        void onUnblock(target).then(
          // 이미 빠진 행이라 개수가 그대로면 잠시 뒤 토스트만(이 해제가 아직 남아 있을 때만, 다른 해제는 건드리지 않음)
          () =>
            setTimeout(() => {
              if (pending.current !== request) return;
              pending.current = null;
              toast(BUNCH_HOME_MESSAGES.unblocked(request.name), { icon: 'success' });
            }, 1000),
          () => {
            if (pending.current === request) pending.current = null;
          },
        );
      },
    );
  };
  const emptyDescriptionId = useId();

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
      <h1 className="sr-only">차단 목록</h1>
      {/* 늘 있는 상태 영역의 글자만 바꿈(새로 붙인 영역은 낭독이 안 될 수 있음) */}
      <p role="status" className="sr-only">
        {blocked === undefined ? BUNCH_HOME_MESSAGES.blockedListLoading : ''}
      </p>
      {blocked === undefined ? <PageLoading /> : null}
      {blocked && blocked.length > 0 ? (
        // 헤더 아래 12, 개수와 목록 사이 12, 행 사이 8(Figma 1873:33766)
        <div className="pt-s6 px-padding-p8 pb-s8 gap-s6 flex flex-col">
          <p
            ref={countRef}
            tabIndex={-1}
            className="typography-body-3-semibold text-text-tertiary gap-s3 flex focus:outline-none"
          >
            <span>차단된 번치</span>
            {/* 간격은 gap이라 낭독용 띄어쓰기만 따로 둠 */}
            <span className="sr-only"> </span>
            <span>{total ?? blocked.length}개</span>
          </p>
          <ul className="gap-s4 flex flex-col">
            {blocked.map((bunch) => (
              <li key={bunch.id}>
                <ProfileListItem
                  name={bunch.name}
                  imageSrc={bunch.imageSrc}
                  action={
                    canUnblock ? (
                      // Figma SolidButton 32px(surface-tertiary, 글자 text-tertiary)
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-text-tertiary"
                        aria-label={`${bunch.name} 차단해제`}
                        onClick={() => openUnblock(bunch)}
                      >
                        차단해제
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
          {total !== undefined && total > blocked.length ? (
            <p className="typography-caption-1-regular text-text-tertiary text-center">
              {BUNCH_HOME_MESSAGES.blockedListMore(blocked.length)}
            </p>
          ) : null}
        </div>
      ) : null}
      {blocked?.length === 0 ? (
        // 화면설계서 3번: 안내 이미지와 문구, 별도 동작 없음(Figma 5991:161676: 이미지 72×72, 이미지와 문구 16, 제목·설명 4)
        // Figma 1873:33828은 본문 세로 가운데보다 약 38 위라 아래 여백 72로 맞춤
        <div className="px-padding-p8 pb-s23 flex min-h-full items-center justify-center">
          <div className="gap-s8 flex flex-col items-center text-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={blockedListEmpty as StaticImageData} alt="" width={72} height={72} />
            <div className="gap-s2 flex flex-col items-center">
              <h2
                ref={emptyRef}
                tabIndex={-1}
                aria-describedby={emptyDescriptionId}
                className="typography-body-1-medium text-text-tertiary focus:outline-none"
              >
                {BUNCH_HOME_MESSAGES.blockedEmptyTitle}
              </h2>
              <p
                id={emptyDescriptionId}
                className="typography-body-4-regular text-text-quaternary whitespace-pre-line"
              >
                {BUNCH_HOME_MESSAGES.blockedEmptyDescription}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
