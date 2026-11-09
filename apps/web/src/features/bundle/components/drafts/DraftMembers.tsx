'use client';

import { AddMemberCard, BundleTitle, MemberCard } from '@app/design-system/web';
import { useState } from 'react';
import type { Draft, DraftMember, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { canRemoveMember, getMemberBadge, type DraftAccess } from '../../lib/permissions';
import { getEditingMemberIds } from '../../lib/publish';
import { RemoveMemberDialog } from './RemoveMemberDialog';

type DraftMembersProps = {
  draft: Draft;
  viewer: DraftViewer;
  access: DraftAccess;
  /** 내가 제목·코멘트를 입력 중인지(내 카드에도 초록 점) */
  selfEditing?: boolean | undefined;
  /** 「추가」 카드를 눌렀을 때(참여 멤버 관리 화면 연결 전에는 생략) */
  onAddMember?: (() => void) | undefined;
  /** 내보내기 확인 창에서 「내보내기」를 눌렀을 때 */
  onRemoveMember: (_memberId: string) => void;
};

/** 참여 멤버 가로 목록: 역할 배지, 편집 중인 멤버의 초록 점, 권한이 있을 때만 삭제 버튼(누르면 내보내기 확인 창), 맨 끝 「추가」 카드 */
export function DraftMembers({
  draft,
  viewer,
  access,
  selfEditing = false,
  onAddMember,
  onRemoveMember,
}: DraftMembersProps) {
  // 닫히는 동안에도 제목의 이름이 남도록 대상은 유지하고 열림만 따로 관리
  const [target, setTarget] = useState<DraftMember | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const editingIds = new Set(getEditingMemberIds(draft.editing));
  if (selfEditing) editingIds.add(viewer.memberId);

  return (
    <section aria-labelledby="draft-members-title" className="pt-padding-p7 gap-s3 flex flex-col">
      <BundleTitle
        title={BUNDLE_MESSAGES.membersTitle}
        titleId="draft-members-title"
        icon={false}
        className="px-padding-p8"
      />
      {/* 카드 오른쪽 위 삭제 버튼이 3px 바깥으로 나와 위 여백을 둠 */}
      <ul className="gap-s4 px-padding-p8 -mt-1 flex scrollbar-none overflow-x-auto pt-1 [&::-webkit-scrollbar]:hidden">
        {draft.members.map((member) => {
          const badge = getMemberBadge(member);
          const removable = canRemoveMember(draft, viewer, member);
          return (
            <li key={member.id} className="shrink-0">
              <MemberCard
                name={member.name}
                src={member.avatarSrc}
                memberRole={badge}
                roleLabel={badge ? BUNDLE_MESSAGES.roleLabel[badge] : undefined}
                editing={editingIds.has(member.id)}
                editingLabel={
                  editingIds.has(member.id) ? BUNDLE_MESSAGES.editingLabel(member.name) : undefined
                }
                onDelete={
                  removable
                    ? () => {
                        setTarget(member);
                        setOpen(true);
                      }
                    : undefined
                }
              />
            </li>
          );
        })}
        {access.canAddMember && (
          <li className="shrink-0">
            <AddMemberCard onClick={onAddMember} />
          </li>
        )}
      </ul>
      <RemoveMemberDialog
        open={open}
        onOpenChange={setOpen}
        target={target}
        onConfirm={(member) => onRemoveMember(member.id)}
      />
    </section>
  );
}
