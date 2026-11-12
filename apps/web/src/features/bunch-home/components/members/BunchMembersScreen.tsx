'use client';

import {
  ActionDialog,
  type ActionDialogAction,
  Header,
  LineAddSmallIcon,
  LineChevronLeftLargeIcon,
  LineChevronRightSmallIcon,
  TextButton,
  toast,
} from '@app/design-system';
import { ProfileImage, ProfileListItem } from '@app/design-system/web';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BunchMemberActions } from '../../hooks/useBunchMembers';
import type { BunchMember, BunchRole } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { ROLE_LABELS } from '../../constants/roles';

/** 번치 최대 인원(기능명세 5.6, 초대 안내 「번치는 최대 8명까지」) */
const BUNCH_MEMBER_LIMIT = 8;

type ConfirmKind = 'appoint' | 'revoke' | 'transfer' | 'remove';

type BunchMembersScreenProps = {
  /** 지금 번치 이름(아직 모르면 undefined) */
  bunchName: string | undefined;
  /** 정렬된 멤버. 아직 모르면 목록을 그리지 않음 */
  members: readonly BunchMember[] | undefined;
  myRole: BunchRole | undefined;
  actions: BunchMemberActions;
  onBack: () => void;
  /** 헤더 「+ 멤버 초대」 */
  onInvite: () => void;
  /** 관리 처리를 서버에 보내는 중(그동안 「⋯」를 숨겨 같은 요청이 두 번 가지 않게 함) */
  busy?: boolean | undefined;
};

/**
 * 내가 이 멤버를 관리할 수 있는지. 서버가 준 동작이 있으면 그대로 따름
 * 샘플 데이터는 Figma 권한 표 2500:54066(공동 관리자는 메인 관리자 외 내보내기만)
 */
const canManage = (myRole: BunchRole | undefined, member: BunchMember) => {
  if (member.actions) return Object.values(member.actions).some(Boolean);
  return !member.isMe && (myRole === 'owner' || (myRole === 'coOwner' && member.role !== 'owner'));
};

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
  onInvite,
  busy = false,
}: BunchMembersScreenProps) {
  const openOverlay = useScreenOverlay();
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const menuActions = (
    member: BunchMember,
    choose: (_kind: ConfirmKind) => void,
  ): ActionDialogAction[] => {
    const allowed = member.actions;
    if (allowed) {
      return [
        ...(allowed.canGrantCoOwner
          ? [{ label: '공동 관리자로 지정하기', onClick: () => choose('appoint') }]
          : []),
        ...(allowed.canRevokeCoOwner
          ? [{ label: '공동 관리자 해제하기', onClick: () => choose('revoke') }]
          : []),
        ...(allowed.canTransferOwner
          ? [{ label: '관리자 권한 넘기기', onClick: () => choose('transfer') }]
          : []),
        ...(allowed.canRemove
          ? [{ label: '번치에서 내보내기', onClick: () => choose('remove') }]
          : []),
      ];
    }
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
          // 번치 이름을 받지 못했으면 「번치」로(제목이 깨지지 않게)
          title: BUNCH_HOME_MESSAGES.removeTitle(name, bunchName ?? '번치'),
          description: BUNCH_HOME_MESSAGES.removeDescription(name),
          label: '내보내기',
          run: () => actions.remove(member.id),
          done: BUNCH_HOME_MESSAGES.removed(name),
        };
    }
  };
  // Figma Dialog Profile: 56px 프로필 이미지(장식)
  const dialogImage = (member: BunchMember) => (
    <ProfileImage src={member.imageSrc} size="M" className="size-14" />
  );

  // 처리한 행이나 「⋯」가 사라져 초점을 잃었으면 요약 줄로(문서 처음으로 가지 않게)
  const keepFocus = () => {
    if (!document.activeElement || document.activeElement === document.body) {
      summaryRef.current?.focus();
    }
  };
  // 초점 복구는 창이 닫힐 때(onClosed)가 주로 맡고, 이 effect는 창이 닫힌 뒤 응답이 와 행이 사라지는 경우의 보조
  // 관리 처리를 한 뒤에만 동작(들어올 때·다시 받을 때 초점을 빼앗지 않음)
  const focusAfterChange = useRef(false);
  useEffect(() => {
    if (!focusAfterChange.current) return;
    keepFocus();
    if (!busy) focusAfterChange.current = false;
  }, [members, busy]);

  const openConfirm = (member: BunchMember, kind: ConfirmKind) => {
    const content = confirmContent(member, kind);
    let result: Promise<unknown> | undefined;
    openOverlay(
      (rootProps, close) => (
        <ActionDialog
          {...rootProps}
          image={dialogImage(member)}
          title={content.title}
          description={content.description}
          actions={[
            {
              label: content.label,
              onClick: () => {
                focusAfterChange.current = true;
                result = Promise.resolve(content.run());
                // 응답 전에 화면을 떠나 onClosed가 불리지 않아도 실패가 처리되지 않은 채 남지 않게
                result.catch(() => {});
                close();
              },
            },
          ]}
        />
      ),
      () => {
        keepFocus();
        // 토스트는 창이 다 닫히고 처리가 끝난 뒤(열린 창 뒤에서 낭독이 묻히지 않게). 실패 안내는 동작 쪽 담당
        void result?.then(
          () => toast(content.done, { icon: 'success' }),
          () => {},
        );
      },
    );
  };

  // 관리 메뉴가 다 닫힌 뒤 확인 창을 엶
  const openManage = (member: BunchMember) => {
    let chosen: ConfirmKind | undefined;
    openOverlay(
      (rootProps, close) => (
        <ActionDialog
          {...rootProps}
          image={dialogImage(member)}
          title={member.name}
          description={ROLE_LABELS[member.role]}
          actions={menuActions(member, (kind) => {
            chosen = kind;
            close();
          })}
        />
      ),
      () => {
        if (chosen) openConfirm(member, chosen);
      },
    );
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 뒤로 가기와 제목 사이 8: 40px 버튼의 오른쪽 여백(8)만큼 제목을 당김(버튼 터치 영역은 그대로)
            <span className="-mr-s4 flex shrink-0">
              <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
                <LineChevronLeftLargeIcon />
              </HeaderIconButton>
            </span>
          }
          title={bunchName}
          // Figma 「+ 멤버 초대」(TextButton sm)
          trailing={
            <TextButton size="sm" leftIcon={<LineAddSmallIcon />} onClick={onInvite}>
              멤버 초대
            </TextButton>
          }
        />
      }
    >
      <h1 className="sr-only">{bunchName ? `${bunchName} 멤버 관리` : '멤버 관리'}</h1>
      <p role="status" className="sr-only">
        {busy ? '처리하는 중이에요' : ''}
      </p>
      {/* 헤더 아래 16, 요약 줄과 목록 사이 12, 행 사이 8(Figma 2500:65206) */}
      {members ? (
        <div className="pt-padding-p8 px-padding-p8 pb-s8 gap-s6 flex flex-col">
          <div className="typography-body-3-semibold flex items-center justify-between">
            {/* 처리한 행이나 「⋯」가 사라지면 초점을 받는 자리 */}
            <p
              ref={summaryRef}
              tabIndex={-1}
              className="text-text-secondary gap-s3 flex focus:outline-none"
            >
              <span>멤버</span>
              {/* 간격은 gap이라 낭독용 띄어쓰기만 따로 둠 */}
              <span className="sr-only"> </span>
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
                  onMore={!busy && canManage(myRole, member) ? () => openManage(member) : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageShell>
  );
}
