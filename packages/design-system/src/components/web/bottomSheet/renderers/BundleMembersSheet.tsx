'use client';

import type { ReactElement, ReactNode } from 'react';
import type { RoleBadgeRole } from '../../roleBadge';
import { Button } from '../../../core/button';
import { ProfileListItem } from '../../profileListItem';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

/** `renderLink`가 받는 값: 링크 요소에 그대로 붙여 같은 모양으로 그림 */
export type BundleMemberLinkState = { className: string; children: ReactNode };

export type BundleMembersSheetItem = {
  name: string;
  imageSrc?: string | undefined;
  /** 역할 배지(일반 멤버는 없음) */
  memberRole?: RoleBadgeRole | undefined;
  /** 역할 배지를 읽을 이름 */
  roleLabel?: string | undefined;
  /** 프로필로 가는 링크를 그림(호출자의 라우터 링크). 없으면 누를 수 없음(나간·탈퇴한 멤버) */
  renderLink?: ((_state: BundleMemberLinkState) => ReactElement) | undefined;
};

export type BundleMembersSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  members: BundleMembersSheetItem[];
};

const LINK_CLASS =
  'focus-visible:outline-border-brand rounded-r5 block touch-manipulation focus-visible:outline-2';

/**
 * 참여 멤버 시트(Figma `5367:112757`): 「참여 멤버」, 멤버 줄 목록, 「취소」
 * 링크는 `renderLink`로 호출자가 그림. 닫기와 이동은 호출자 담당
 */
export const BundleMembersSheet = ({ members, ...rootProps }: BundleMembersSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      <BottomSheet.Header>
        <BottomSheet.Title>참여 멤버</BottomSheet.Title>
      </BottomSheet.Header>
      <BottomSheet.Body>
        <ul className="gap-s4 flex flex-col">
          {members.map(({ name, imageSrc, memberRole, roleLabel, renderLink }, index) => {
            const row = (
              <ProfileListItem
                name={name}
                imageSrc={imageSrc}
                memberRole={memberRole}
                roleLabel={roleLabel}
              />
            );
            return (
              <li key={`${name}-${index}`}>
                {renderLink ? renderLink({ className: LINK_CLASS, children: row }) : row}
              </li>
            );
          })}
        </ul>
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button variant="secondary" onClick={() => rootProps.onOpenChange(false)}>
          취소
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);
