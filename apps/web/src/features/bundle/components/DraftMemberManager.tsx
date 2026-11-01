'use client';

import { Header, LineChevronLeftLargeIcon, LineCloseMediumIcon, toast } from '@app/design-system';
import { ChipButton, ProfileListItem } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../hooks/useDraft';
import type { Draft, DraftMember, DraftViewer } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { useMoveAnimation } from '../hooks/useMoveAnimation';
import { canRemoveMember, getDraftAccess, getMemberBadge } from '../lib/permissions';
import { LeaveDraftDialog } from './LeaveDraftDialog';
import { RemoveMemberDialog } from './RemoveMemberDialog';

type DraftMemberManagerProps = {
  draft: Draft;
  viewer: DraftViewer;
  /** 번치 멤버 전체. 참여 멤버가 아닌 멤버가 「멤버 추가하기」에 나옴 */
  bunchMembers: readonly DraftMember[];
  actions: Pick<DraftActions, 'addMember' | 'removeMember'>;
  onBack: () => void;
  /** 나가기 확인 창에서 「나가기」를 눌렀을 때 */
  onLeave: () => void;
};

/**
 * 참여 멤버 관리 화면(기능 spec 4.3.2, 설계서 `2034:22714`): 위 「멤버 추가하기」, 아래 「참여 멤버」
 * 추가·내보내기는 카드의 목록 간 이동(400ms)과 토스트 안내, 내 카드의 X는 나가기 확인 창
 * 「추가하기」는 참여 멤버에게만, 다른 멤버의 X는 초안 생성자·참여 중인 관리자에게만 노출
 */
export function DraftMemberManager({
  draft,
  viewer,
  bunchMembers,
  actions,
  onBack,
  onLeave,
}: DraftMemberManagerProps) {
  const access = getDraftAccess(draft, viewer);
  const { register, capture } = useMoveAnimation();
  const [removeTarget, setRemoveTarget] = useState<DraftMember | undefined>(undefined);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // 카드가 다른 목록으로 옮겨가면 눌렀던 요소가 사라져 포커스를 잃으므로, 옮겨간 카드의 버튼으로 포커스를 옮김
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusId === undefined) return;
    const frame = requestAnimationFrame(() => {
      // 삭제 버튼이 없는 카드(권한 없는 참여 멤버가 추가한 경우)는 카드 자체로 대신함
      const target =
        root.current?.querySelector<HTMLElement>(`[data-member-action="${focusId}"]`) ??
        root.current?.querySelector<HTMLElement>(`[data-member-row="${focusId}"]`);
      target?.focus();
      setFocusId(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusId]);

  const addable = bunchMembers.filter(
    (candidate) => !draft.members.some((member) => member.id === candidate.id),
  );

  const add = (member: DraftMember) => {
    capture();
    actions.addMember(member.id);
    setFocusId(member.id);
    toast(BUNDLE_MESSAGES.memberAdded(member.name), { fullWidth: true });
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">참여 멤버 관리</h1>
      <div ref={root} className="px-padding-p8 pb-s16 gap-s14 flex flex-col pt-1.25">
        {access.canAddMember && addable.length > 0 && (
          <section aria-labelledby="add-members-title" className="gap-s5 flex flex-col">
            <h2 id="add-members-title" className="typography-body-1-medium text-text-primary">
              {BUNDLE_MESSAGES.addMembersTitle}
            </h2>
            <ul className="gap-s4 flex flex-col">
              {addable.map((member) => (
                <li key={member.id} ref={register(member.id)}>
                  <ProfileListItem
                    name={member.name}
                    imageSrc={member.avatarSrc}
                    action={
                      <ChipButton
                        size="M"
                        data-member-action={member.id}
                        aria-label={BUNDLE_MESSAGES.addMemberLabel(member.name)}
                        onClick={() => add(member)}
                      >
                        {BUNDLE_MESSAGES.addMemberButton}
                      </ChipButton>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="joined-members-title" className="gap-s5 flex flex-col">
          <h2 id="joined-members-title" className="typography-body-1-medium text-text-primary">
            {BUNDLE_MESSAGES.membersTitle}
          </h2>
          <ul className="gap-s4 flex flex-col">
            {draft.members.map((member) => {
              const isMe = member.id === viewer.memberId;
              const badge = getMemberBadge(member);
              // 내 카드는 참여 멤버 누구에게나 X(스스로 나가기), 다른 멤버는 권한이 있을 때만
              const removable = isMe || canRemoveMember(draft, viewer, member);
              return (
                <li
                  key={member.id}
                  ref={register(member.id)}
                  data-member-row={member.id}
                  tabIndex={-1}
                  className="outline-none"
                >
                  <ProfileListItem
                    name={member.name}
                    suffix={isMe ? BUNDLE_MESSAGES.selfSuffix : undefined}
                    imageSrc={member.avatarSrc}
                    memberRole={badge}
                    roleLabel={badge ? BUNDLE_MESSAGES.roleLabel[badge] : undefined}
                    action={
                      removable ? (
                        <button
                          type="button"
                          data-member-action={member.id}
                          aria-label={
                            isMe
                              ? BUNDLE_MESSAGES.leaveMemberLabel
                              : BUNDLE_MESSAGES.removeMemberLabel(member.name)
                          }
                          onClick={() => {
                            if (isMe) {
                              setLeaveOpen(true);
                            } else {
                              setRemoveTarget(member);
                              setRemoveOpen(true);
                            }
                          }}
                          // 아이콘 20px·누르는 영역 40px(ProfileListItem의 더보기 버튼과 같은 배치)
                          className="text-icon-primary -m-s5 p-s5 focus-visible:outline-border-brand relative inline-flex shrink-0 cursor-pointer touch-manipulation rounded-full focus-visible:outline-2"
                        >
                          <LineCloseMediumIcon aria-hidden="true" />
                        </button>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <RemoveMemberDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        target={removeTarget}
        onConfirm={(member) => {
          capture();
          actions.removeMember(member.id);
        }}
        // 창이 닫힌 뒤에 옮겨야 닫히는 모달에 포커스를 빼앗기지 않음
        onClosed={(member) => setFocusId(member.id)}
      />
      <LeaveDraftDialog open={leaveOpen} onOpenChange={setLeaveOpen} onConfirm={onLeave} />
    </PageShell>
  );
}
