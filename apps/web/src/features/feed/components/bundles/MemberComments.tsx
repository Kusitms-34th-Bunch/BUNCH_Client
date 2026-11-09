'use client';

import { cn } from '@app/design-system';
import { ChipButton } from '@app/design-system/web';
import { useState } from 'react';
import type { FeedMemberComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';

/**
 * 멤버별 코멘트(기능명세서 6.2.5, Figma `5367:103515`): 참여 멤버 칩(가로 스크롤, 처음엔 첫 멤버)과 선택한 멤버의 코멘트
 * 나간·탈퇴한 멤버는 「작성자」, 내용 대신 「삭제된 코멘트입니다」
 */
export function MemberComments({ members }: { members: FeedMemberComment[] }) {
  const [selectedId, setSelectedId] = useState(members[0]?.id);
  const selected = members.find(({ id }) => id === selectedId);
  if (!selected) return null;
  const selectedName = selected.left ? text.leftMember : selected.name;

  return (
    <section aria-label={text.memberCommentsLabel} className="gap-s4 flex flex-col pt-6">
      <div
        role="group"
        aria-label={text.memberChipsLabel}
        className="gap-s4 px-padding-p8 flex scrollbar-none overflow-x-auto"
      >
        {members.map((member) => (
          <ChipButton
            key={member.id}
            size="M"
            variant="avatar"
            avatarSrc={member.left ? undefined : member.imageSrc}
            selected={member.id === selectedId}
            onClick={() => setSelectedId(member.id)}
          >
            {member.left ? text.leftMember : member.name}
          </ChipButton>
        ))}
      </div>
      {/* 칩을 고르면 바뀐 코멘트를 읽어 줌 */}
      <p
        aria-live="polite"
        className={cn(
          'bg-surface-secondary rounded-r5 mx-padding-p8 p-padding-p8 typography-body-3-regular wrap-break-word whitespace-pre-line',
          selected.left ? 'text-text-quaternary' : 'text-text-tertiary',
        )}
      >
        <span className="sr-only">{text.memberCommentOf(selectedName)}</span>
        {selected.left ? text.deletedMemberComment : selected.comment}
      </p>
    </section>
  );
}
