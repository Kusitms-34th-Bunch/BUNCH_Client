'use client';

import { ActionDialog, Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { ProfileImage, ProfileListItem } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useId, useRef, useState } from 'react';
import blockedListEmpty from '@/shared/assets/images/empty/blocked-list-empty.svg';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { BlockedBunch } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type BunchBlockedListScreenProps = {
  /** 차단한 번치. 아직 모르면(첫 hydration) 목록을 그리지 않음 */
  blocked: readonly BlockedBunch[] | undefined;
  /** 차단 해제 가능 여부(메인·공동 관리자). 일반 멤버는 목록만 봄 */
  canUnblock: boolean;
  onUnblock: (_blockedId: string) => void;
  onBack: () => void;
};

/**
 * 번치 차단 목록(기능명세 5.7, 화면설계서 2236:40175): 「차단된 번치 N개」, 차단해제 → 확인 → 토스트, 빈 상태
 */
export function BunchBlockedListScreen({
  blocked,
  canUnblock,
  onUnblock,
  onBack,
}: BunchBlockedListScreenProps) {
  const [target, setTarget] = useState<BlockedBunch | null>(null);
  const [open, setOpen] = useState(false);
  // 확인 창이 다 닫힌 뒤 띄울 토스트(열린 창 뒤에서 낭독이 묻히지 않게)
  const doneMessage = useRef<string | null>(null);
  // 해제한 행이 사라지면 초점을 받는 자리(목록이 비면 빈 상태 제목). 개수 줄과 빈 상태는 동시에 그려지지 않음
  const focusRef = useRef<HTMLElement>(null);
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
      {blocked && blocked.length > 0 ? (
        // 헤더 아래 12, 개수와 목록 사이 12, 행 사이 8(Figma 1873:33766)
        <div className="pt-s6 px-padding-p8 pb-s8 gap-s6 flex flex-col">
          <p
            ref={(node) => {
              focusRef.current = node;
            }}
            tabIndex={-1}
            className="typography-body-3-semibold text-text-tertiary gap-s3 flex focus:outline-none"
          >
            <span>차단된 번치</span>
            {/* 간격은 gap이라 낭독용 띄어쓰기만 따로 둠 */}
            <span className="sr-only"> </span>
            <span>{blocked.length}개</span>
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
                        onClick={() => {
                          setTarget(bunch);
                          setOpen(true);
                        }}
                      >
                        차단해제
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {blocked?.length === 0 ? (
        // 화면설계서 3번: 안내 이미지와 문구, 별도 동작 없음(Figma 4331:59751: 이미지 130×109, 이미지와 문구 16, 제목·설명 4)
        // Figma 1873:33828은 본문 세로 가운데보다 약 38 위라 아래 여백 72로 맞춤
        <div className="px-padding-p8 pb-s23 flex min-h-full items-center justify-center">
          <div className="gap-s8 flex flex-col items-center text-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={blockedListEmpty as StaticImageData} alt="" width={130} height={109} />
            <div className="gap-s2 flex flex-col items-center">
              <h2
                ref={(node) => {
                  focusRef.current = node;
                }}
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

      {/* Figma 2141:37877: 이미지 + 「해제하기」·「취소」 세로 배치(설계의 「번치에서 내보내기」는 번치 단위 차단과 맞지 않아 뺌) */}
      <ActionDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
        onOpenChangeComplete={(next) => {
          if (next) return;
          setTarget(null);
          if (!doneMessage.current) return;
          // 해제하면 돌아갈 「차단해제」 버튼이 사라지므로 개수 줄(목록이 비면 빈 상태 제목)로
          focusRef.current?.focus();
          toast(doneMessage.current, { icon: 'success', fullWidth: true });
          doneMessage.current = null;
        }}
        image={
          target ? <ProfileImage src={target.imageSrc} size="M" className="size-14" /> : undefined
        }
        title={target ? BUNCH_HOME_MESSAGES.unblockTitle(target.name) : ''}
        description={target ? BUNCH_HOME_MESSAGES.unblockDescription : ''}
        actions={
          target
            ? [
                {
                  label: '해제하기',
                  onClick: () => {
                    onUnblock(target.id);
                    doneMessage.current = BUNCH_HOME_MESSAGES.unblocked(target.name);
                    setOpen(false);
                  },
                },
              ]
            : []
        }
      />
    </PageShell>
  );
}
