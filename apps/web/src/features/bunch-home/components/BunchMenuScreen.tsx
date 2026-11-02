'use client';

import { ConfirmDialog, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { MenuDivider, MenuLabel } from '@app/design-system/web';
import Link from 'next/link';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { BunchRole } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';

type BunchMenuScreenProps = {
  /** 지금 번치 이름(첫 hydration처럼 아직 모르면 undefined) */
  bunchName: string | undefined;
  /** 지금 번치에서 내 역할. 모르면 메뉴를 그리지 않음 */
  myRole: BunchRole | undefined;
  /** 나만 남은 번치(나가지 못하고 삭제 안내, 화면설계서 4-2) */
  alone?: boolean | undefined;
  onBack: () => void;
  /** 메인 관리자가 아닌 멤버가 나가기 확인 창에서 「나가기」를 눌렀을 때 */
  onLeave: () => void;
  /** 메인 관리자의 「번치 나가기」(새 관리자 지정 화면으로) */
  onOwnerLeave?: (() => void) | undefined;
  /** 나만 남은 번치 안내의 「삭제하기」. 번치 삭제 화면 전까지는 넘기지 않아 창만 닫힘 */
  onDeleteBunch?: (() => void) | undefined;
};

/**
 * 번치 더보기 메뉴(기능명세 5.4): 역할별 메뉴. 메인 관리자만 프로필 편집·번치 삭제
 * 나가기는 역할별(일반 멤버·공동 관리자 확인 창, 메인 관리자 지정 화면, 나만 남으면 삭제 안내). 번치 삭제 메뉴는 후속 이슈
 */
export function BunchMenuScreen({
  bunchName,
  myRole,
  alone = false,
  onBack,
  onLeave,
  onOwnerLeave,
  onDeleteBunch,
}: BunchMenuScreenProps) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [aloneOpen, setAloneOpen] = useState(false);
  const isOwner = myRole === 'owner';

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 헤더 뒤로 가기 아이콘 색(가입 단계 헤더와 같은 연한 회색)
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{bunchName ? `${bunchName} 번치 더보기` : '번치 더보기'}</h1>
      {/* 항목 사이 4, 묶음과 구분선 사이 12(Figma 1873:34575) */}
      {myRole ? (
        <div className="gap-s6 pt-padding-p6 flex flex-col">
          <ul className="gap-s2 px-padding-p8 flex flex-col">
            {isOwner ? (
              <li>
                <MenuLabel
                  renderLink={({ className, children }) => (
                    <Link href={BUNCH_HOME_PATHS.profile} className={className}>
                      {children}
                    </Link>
                  )}
                >
                  프로필 편집
                </MenuLabel>
              </li>
            ) : null}
            <li>
              <MenuLabel
                renderLink={({ className, children }) => (
                  <Link href={BUNCH_HOME_PATHS.members} className={className}>
                    {children}
                  </Link>
                )}
              >
                멤버 관리
              </MenuLabel>
            </li>
            <li>
              <MenuLabel
                renderLink={({ className, children }) => (
                  <Link href={BUNCH_HOME_PATHS.invite} className={className}>
                    {children}
                  </Link>
                )}
              >
                멤버 초대
              </MenuLabel>
            </li>
            <li>
              <MenuLabel
                renderLink={({ className, children }) => (
                  <Link href={BUNCH_HOME_PATHS.blocked} className={className}>
                    {children}
                  </Link>
                )}
              >
                차단 목록
              </MenuLabel>
            </li>
          </ul>
          <MenuDivider className="mx-padding-p8" />
          <ul className="gap-s2 px-padding-p8 flex flex-col">
            <li>
              <MenuLabel
                onClick={() => {
                  if (alone) setAloneOpen(true);
                  else if (isOwner) onOwnerLeave?.();
                  else setLeaveOpen(true);
                }}
              >
                번치 나가기
              </MenuLabel>
            </li>
            {isOwner ? (
              <li>
                <MenuLabel>번치 삭제</MenuLabel>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={BUNCH_HOME_MESSAGES.leaveTitle(bunchName ?? '')}
        description={BUNCH_HOME_MESSAGES.leaveDescription}
        cancelLabel="취소"
        confirmLabel="나가기"
        onConfirm={() => {
          setLeaveOpen(false);
          onLeave();
        }}
      />
      <ConfirmDialog
        open={aloneOpen}
        onOpenChange={setAloneOpen}
        title={BUNCH_HOME_MESSAGES.aloneTitle}
        description={BUNCH_HOME_MESSAGES.aloneDescription}
        cancelLabel="취소"
        confirmLabel="삭제하기"
        onConfirm={() => {
          setAloneOpen(false);
          onDeleteBunch?.();
        }}
      />
    </PageShell>
  );
}
