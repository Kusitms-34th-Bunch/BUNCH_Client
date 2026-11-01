'use client';

import {
  ActionDialog,
  type ActionDialogAction,
  Header,
  LineChevronLeftLargeIcon,
  LineChevronRightSmallIcon,
  toast,
} from '@app/design-system';
import { ProfileImage, ProfileListItem } from '@app/design-system/web';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { BunchMemberActions } from '../hooks/useBunchMembers';
import type { BunchMember, BunchRole } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';

/** 번치 최대 인원(기능명세 5.6, 초대 안내 「번치는 최대 8명까지」) */
const BUNCH_MEMBER_LIMIT = 8;

const ROLE_LABELS: Record<BunchRole, string> = {
  owner: '메인 관리자',
  coOwner: '공동 관리자',
  member: '일반 멤버',
};

type ConfirmKind = 'appoint' | 'revoke' | 'transfer' | 'remove';

type BunchMembersScreenProps = {
  /** 지금 번치 이름(아직 모르면 undefined) */
  bunchName: string | undefined;
  /** 정렬된 멤버. 아직 모르면 목록을 그리지 않음 */
  members: readonly BunchMember[] | undefined;
  myRole: BunchRole | undefined;
  actions: BunchMemberActions;
  onBack: () => void;
};

/** 내가 이 멤버를 관리할 수 있는지(Figma 권한 표 2500:54066: 공동 관리자는 메인 관리자 외 내보내기만) */
const canManage = (myRole: BunchRole | undefined, member: BunchMember) =>
  !member.isMe && (myRole === 'owner' || (myRole === 'coOwner' && member.role !== 'owner'));

/**
 * 번치 멤버 관리(기능명세 5.6, 화면설계서 2198:42965): 역할순 목록, 관리 메뉴 → 확인 창 → 토스트
 * 메인 관리자는 지정·해제·넘기기·내보내기, 공동 관리자는 내보내기만, 일반 멤버는 목록만
 */
export function BunchMembersScreen({
  bunchName,
  members,
  myRole,
  actions,
  onBack,
}: BunchMembersScreenProps) {
  const [target, setTarget] = useState<BunchMember | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // 고른 동작. 관리 메뉴가 다 닫힌 뒤 확인 창을 열고, 확인 창이 다 닫힐 때까지 문구 유지
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 처리한 뒤 확인 창이 다 닫히면 띄울 토스트(열린 창 뒤에서 낭독이 묻히지 않게)
  const doneMessage = useRef<string | null>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const choose = (kind: ConfirmKind) => {
    setConfirm(kind);
    setMenuOpen(false);
  };
  const menuActions = (member: BunchMember): ActionDialogAction[] => {
    if (myRole !== 'owner')
      return [{ label: '번치에서 내보내기', onClick: () => choose('remove') }];
    return [
      member.role === 'coOwner'
        ? { label: '공동 관리자 해제하기', onClick: () => choose('revoke') }
        : { label: '공동 관리자로 지정하기', onClick: () => choose('appoint') },
      { label: '관리자 권한 넘기기', onClick: () => choose('transfer') },
      { label: '번치에서 내보내기', onClick: () => choose('remove') },
    ];
  };

  const confirmContent = (member: BunchMember, kind: ConfirmKind) => {
    const { name } = member;
    switch (kind) {
      case 'appoint':
        return {
          title: BUNCH_HOME_MESSAGES.appointTitle(name),
          description: BUNCH_HOME_MESSAGES.appointDescription,
          label: '완료',
          run: () => actions.setRole(member.id, 'coOwner'),
          done: BUNCH_HOME_MESSAGES.appointed(name),
        };
      case 'revoke':
        return {
          title: BUNCH_HOME_MESSAGES.revokeTitle(name),
          description: BUNCH_HOME_MESSAGES.revokeDescription,
          label: '해제하기',
          run: () => actions.setRole(member.id, 'member'),
          done: BUNCH_HOME_MESSAGES.revoked(name),
        };
      case 'transfer':
        return {
          title: BUNCH_HOME_MESSAGES.transferTitle(name),
          description: BUNCH_HOME_MESSAGES.transferDescription,
          label: '완료',
          run: () => actions.transferOwner(member.id),
          done: BUNCH_HOME_MESSAGES.transferred(name),
        };
      case 'remove':
        return {
          title: BUNCH_HOME_MESSAGES.removeTitle(name, bunchName ?? ''),
          description: BUNCH_HOME_MESSAGES.removeDescription(name),
          label: '내보내기',
          run: () => actions.remove(member.id),
          done: BUNCH_HOME_MESSAGES.removed(name),
        };
    }
  };
  const content = target && confirm ? confirmContent(target, confirm) : null;
  // Figma Dialog Profile: 56px 프로필 이미지(장식)
  const dialogImage = target ? (
    <ProfileImage src={target.imageSrc} size="M" className="size-14" />
  ) : undefined;

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
          title={bunchName}
          // Figma 오른쪽 「+ 멤버 초대」는 멤버 초대 화면이 생기면 연결과 함께 표시(동작 없는 버튼을 두지 않음)
        />
      }
    >
      <h1 className="sr-only">{bunchName ? `${bunchName} 멤버 관리` : '멤버 관리'}</h1>
      {/* 헤더 아래 16, 요약 줄과 목록 사이 12, 행 사이 8(Figma 2500:65206) */}
      {members ? (
        <div className="pt-padding-p8 px-padding-p8 pb-s8 gap-s6 flex flex-col">
          <div className="typography-body-3-semi-bold flex items-center justify-between">
            {/* 처리한 행이나 「⋯」가 사라지면 초점을 받는 자리 */}
            <p
              ref={summaryRef}
              tabIndex={-1}
              className="text-text-secondary gap-s3 flex focus:outline-none"
            >
              <span>멤버</span>
              <span>
                {members.length}/{BUNCH_MEMBER_LIMIT}명
              </span>
            </p>
            <Link
              href={BUNCH_HOME_PATHS.roles}
              // 글자 한 줄(21px)이라 위아래 4px씩 누르는 영역을 넓히고 배치는 유지
              className="text-text-tertiary gap-s1 focus-visible:outline-border-brand rounded-r2 py-s2 -my-s2 flex items-center focus-visible:outline-2"
            >
              역할별 권한보기
              <LineChevronRightSmallIcon aria-hidden />
            </Link>
          </div>
          <ul className="gap-s4 flex flex-col">
            {members.map((member) => (
              <li key={member.id}>
                <ProfileListItem
                  name={member.name}
                  suffix={member.isMe ? '(나)' : undefined}
                  imageSrc={member.imageSrc}
                  memberRole={member.role === 'member' ? undefined : member.role}
                  roleLabel={member.role === 'member' ? undefined : ROLE_LABELS[member.role]}
                  moreLabel={`${member.name} 관리`}
                  onMore={
                    canManage(myRole, member)
                      ? () => {
                          setTarget(member);
                          setConfirm(null);
                          setMenuOpen(true);
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ActionDialog
        open={menuOpen}
        onOpenChange={(open) => {
          if (!open) setMenuOpen(false);
        }}
        onOpenChangeComplete={(open) => {
          if (!open && confirm) setConfirmOpen(true);
        }}
        image={dialogImage}
        title={target?.name ?? ''}
        description={target ? ROLE_LABELS[target.role] : ''}
        actions={target ? menuActions(target) : []}
      />
      <ActionDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
        onOpenChangeComplete={(open) => {
          if (open) return;
          // 닫히는 도중 다른 「⋯」로 관리 메뉴를 다시 열었으면 새 대상을 지우지 않음
          if (!menuOpen) {
            setConfirm(null);
            setTarget(null);
          }
          // 내보내기·넘기기로 돌아갈 「⋯」가 없어졌으면 요약 줄로(문서 처음으로 가지 않게)
          if (!document.activeElement || document.activeElement === document.body) {
            summaryRef.current?.focus();
          }
          if (doneMessage.current) {
            toast(doneMessage.current, { icon: 'success', fullWidth: true });
            doneMessage.current = null;
          }
        }}
        image={dialogImage}
        title={content?.title ?? ''}
        description={content?.description ?? ''}
        actions={
          content
            ? [
                {
                  label: content.label,
                  onClick: () => {
                    content.run();
                    doneMessage.current = content.done;
                    setConfirmOpen(false);
                  },
                },
              ]
            : []
        }
      />
    </PageShell>
  );
}
