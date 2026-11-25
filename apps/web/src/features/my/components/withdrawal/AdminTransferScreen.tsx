'use client';

import { Button, Header } from '@app/design-system';
import { BunchAccordion, ProfileRadioCard } from '@app/design-system/web';
import { useId, useState } from 'react';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { OwnedBunch } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { AdminTransferSkeleton } from './AdminTransferSkeleton';

const text = MY_MESSAGES.transfer;

/** 번치별 새 메인 관리자 id */
export type TransferSelections = Readonly<Record<string, string>>;

type AdminTransferScreenProps = {
  bunches: readonly OwnedBunch[];
  /** 첫 목록을 받는 중(접힌 카드 자리만) */
  loading: boolean;
  /** 권한을 넘기는 중(「다음」 busy, 선택 잠금) */
  sending: boolean;
  /** 넘긴 뒤 돌아가는 전환 중(다시 누르기·선택 잠금) */
  done: boolean;
  bunchImageOf: (_bunch: OwnedBunch) => string;
  onSubmit: (_selections: TransferSelections) => void;
  onBack: () => void;
};

/**
 * 탈퇴 전 관리자 권한 이전(화면 설계서 MY(5) 4~5번): 메인 관리자인 번치마다 새 메인 관리자 한 명 선택
 * 모든 번치를 고르면 「다음」(실패·빈 목록 처리는 컨테이너와 spec)
 */
export function AdminTransferScreen({
  bunches,
  loading,
  sending,
  done,
  bunchImageOf,
  onSubmit,
  onBack,
}: AdminTransferScreenProps) {
  const progressId = useId();
  const [selections, setSelections] = useState<Record<string, string>>({});
  // 다시 받은 목록에서 빠진 멤버를 고른 번치는 고르지 않은 것으로 셈
  const isPicked = (bunch: OwnedBunch) =>
    bunch.candidates.some((member) => member.id === selections[bunch.id]);
  const picked = bunches.filter(isPicked).length;
  const ready = bunches.length > 0 && picked === bunches.length;

  return (
    <PageShell
      header={<Header leading={<HeaderBackButton tone="subtle" onClick={onBack} />} />}
      bottom={
        <div className="px-padding-p8">
          {/* 막힌 이유와 남은 번치를 보조기기에 전달(접힌 카드는 선택 여부가 보이지 않음) */}
          {bunches.length > 0 ? (
            <p id={progressId} className="sr-only">
              {text.progress(picked, bunches.length)}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={!ready || done}
            aria-busy={sending || undefined}
            aria-describedby={bunches.length > 0 ? progressId : undefined}
            onClick={() => onSubmit(selections)}
          >
            {text.next}
          </Button>
        </div>
      }
    >
      <h1 className="sr-only">{text.title}</h1>
      {/* 받는 중은 접힌 번치 카드 자리만(「다음」은 고를 번치가 없어 막혀 있음) */}
      {/* Figma 헤더 아래 16, 카드 사이 6 */}
      {loading ? (
        <AdminTransferSkeleton />
      ) : (
        <div className="gap-s3 px-padding-p8 pt-s8 pb-s8 flex flex-col">
          {bunches.map((bunch) => {
            const pickedMember = bunch.candidates.find(
              (member) => member.id === selections[bunch.id],
            );
            return (
              <BunchAccordion
                key={bunch.id}
                name={bunch.name}
                imageSrc={bunchImageOf(bunch)}
                headingLevel={2}
                // 새 관리자를 고르면 접혔을 때 선택 상태로 표시(Figma Status=Selected)
                selected={pickedMember !== undefined}
                selectedLabel={pickedMember ? text.selected(pickedMember.name) : undefined}
              >
                {/* Figma 좌우 10, 「멤버」와 목록 사이 8, 멤버 사이 2 */}
                {/* 보내는 동안·넘긴 뒤에는 선택을 잠금(화면의 새 관리자와 실제로 넘긴 사람이 달라지지 않게) */}
                <fieldset disabled={sending || done} className="px-padding-p5 min-w-0">
                  <legend className="typography-body-4-semi-bold text-text-quaternary px-padding-p5 mb-s4">
                    {/* 여러 번치의 같은 「멤버」 그룹을 구분하도록 번치 이름을 함께 낭독 */}
                    <span className="sr-only">{bunch.name} </span>
                    {text.members}
                  </legend>
                  <div className="gap-s1 flex flex-col">
                    {bunch.candidates.map((member) => (
                      <ProfileRadioCard
                        key={member.id}
                        name={`new-owner-${bunch.id}`}
                        value={member.id}
                        label={member.name}
                        imageSrc={member.imageSrc}
                        memberRole={member.role === 'coOwner' ? 'coOwner' : undefined}
                        roleLabel={member.role === 'coOwner' ? text.coOwner : undefined}
                        // Figma 탈퇴하기(7916:104588): 아코디언 안 멤버 카드는 선택 테두리 없이 라디오 점으로만 표시
                        className="has-checked:ring-0"
                        checked={selections[bunch.id] === member.id}
                        onChange={() =>
                          setSelections((prev) => ({ ...prev, [bunch.id]: member.id }))
                        }
                      />
                    ))}
                  </div>
                </fieldset>
              </BunchAccordion>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
