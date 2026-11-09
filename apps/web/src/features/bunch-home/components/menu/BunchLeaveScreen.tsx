'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { AdminTransferSheet, PageHeader, ProfileRadioCard } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useId, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import ownerAssign from '@/shared/assets/images/empty/owner-assign.svg';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BunchMember } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { ROLE_LABELS } from '../../constants/roles';

type BunchLeaveScreenProps = {
  /** 관리자로 지정할 수 있는 멤버(나 제외). 아직 모르면 목록을 그리지 않음 */
  candidates: readonly BunchMember[] | undefined;
  onBack: () => void;
  /** 확인 시트의 「지정하고 나가기」 */
  onTransferAndLeave: (_member: BunchMember) => void;
};

/**
 * 메인 관리자의 번치 나가기(기능명세 5.8, 화면설계서 2236:40773 1~2-3): 새 관리자 한 명을 고른 뒤 확인 시트로 나가기
 */
export function BunchLeaveScreen({
  candidates,
  onBack,
  onTransferAndLeave,
}: BunchLeaveScreenProps) {
  const descriptionId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openOverlay = useScreenOverlay();
  const selected = candidates?.find((member) => member.id === selectedId);
  const isCandidate = usePreservedCallback((id: string) =>
    Boolean(candidates?.some((member) => member.id === id)),
  );
  const openTransfer = (member: NonNullable<typeof selected>) =>
    openOverlay((rootProps, close) => (
      <AdminTransferSheet
        {...rootProps}
        memberName={member.name}
        // Figma 5991:163239: 안내 그림 72×72(시트의 92px 자리 가운데)
        illustration={
          <div className="flex size-full items-center justify-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={ownerAssign as StaticImageData} alt="" width={72} height={72} />
          </div>
        }
        onConfirm={() => {
          close();
          // 시트가 열린 사이 후보에서 빠졌으면 넘기지 않음
          if (isCandidate(member.id)) onTransferAndLeave(member);
        }}
      />
    ));

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
      bottom={
        // Figma Indicator + CTA: 위 14. 처음엔 선택이 없어 비활성(화면설계서 1번)
        <div className="pt-padding-p7 px-padding-p8">
          <Button
            className="w-full"
            disabled={!selected}
            onClick={() => selected && openTransfer(selected)}
          >
            관리자로 지정하기
          </Button>
        </div>
      }
    >
      {/* 제목 아래 16, 카드 사이 10(Figma 1892:36323) */}
      <div className="gap-s8 pb-s8 flex flex-col">
        <PageHeader
          title={BUNCH_HOME_MESSAGES.leaveTransferTitle}
          description={
            <span id={descriptionId}>{BUNCH_HOME_MESSAGES.leaveTransferDescription}</span>
          }
        />
        {candidates ? (
          // 그룹에 들어서면 안내(선택한 멤버가 새 관리자)도 함께 읽힘
          <fieldset aria-describedby={descriptionId} className="px-padding-p8 min-w-0">
            <legend className="sr-only">새 관리자</legend>
            <div className="gap-s5 flex flex-col">
              {candidates.map((member) => (
                <ProfileRadioCard
                  key={member.id}
                  name="new-owner"
                  value={member.id}
                  label={member.name}
                  imageSrc={member.imageSrc}
                  memberRole={member.role === 'member' ? undefined : member.role}
                  roleLabel={member.role === 'member' ? undefined : ROLE_LABELS[member.role]}
                  checked={member.id === selectedId}
                  onChange={() => setSelectedId(member.id)}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>
    </PageShell>
  );
}
