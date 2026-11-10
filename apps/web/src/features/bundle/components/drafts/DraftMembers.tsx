'use client';

import { AddMemberCard, BundleTitle, MemberCard } from '@app/design-system/web';
import { useEffect, useRef } from 'react';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { canRemoveMember, getMemberBadge, type DraftAccess } from '../../lib/permissions';
import { getEditingMemberIds } from '../../lib/publish';
import { useRemoveMemberDialog } from './RemoveMemberDialog';

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
  const openRemove = useRemoveMemberDialog();
  const listRef = useRef<HTMLUListElement>(null);
  // 내보내면 누른 X가 사라지므로, 목록에서 빠진 뒤(서버 응답 뒤일 수 있음) 같은 자리부터 다음 버튼으로 초점을 옮김
  const pendingFocus = useRef<{ id: string; index: number } | undefined>(undefined);
  const memberIds = draft.members.map(({ id }) => id).join(',');
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || memberIds.split(',').includes(pending.id)) return;
    pendingFocus.current = undefined;
    const items = [...(listRef.current?.querySelectorAll('li') ?? [])];
    const target = [...items.slice(pending.index), ...items.slice(0, pending.index).reverse()]
      .map((item) => item.querySelector<HTMLElement>('button'))
      .find(Boolean);
    target?.focus();
  }, [memberIds]);
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
      <ul
        ref={listRef}
        className="gap-s4 px-padding-p8 -mt-1 flex scrollbar-none overflow-x-auto pt-1 [&::-webkit-scrollbar]:hidden"
      >
        {draft.members.map((member, index) => {
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
                    ? () =>
                        openRemove(
                          member,
                          ({ id }) => onRemoveMember(id),
                          () => {
                            pendingFocus.current = { id: member.id, index };
                          },
                        )
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
    </section>
  );
}
