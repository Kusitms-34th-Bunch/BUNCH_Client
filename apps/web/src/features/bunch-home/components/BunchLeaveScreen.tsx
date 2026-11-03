'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { AdminTransferSheet, PageHeader, ProfileRadioCard } from '@app/design-system/web';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { BunchMember } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { ROLE_LABELS } from '../constants/roles';

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const selected = candidates?.find((member) => member.id === selectedId);

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
          <Button className="w-full" disabled={!selected} onClick={() => setSheetOpen(true)}>
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
      {selected ? (
        <AdminTransferSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          memberName={selected.name}
          // 안내 그림은 최종본 전달 전 자리표시
          illustration={<div className="bg-surface-tertiary size-full" />}
          onConfirm={() => {
            setSheetOpen(false);
            onTransferAndLeave(selected);
          }}
        />
      ) : null}
    </PageShell>
  );
}
