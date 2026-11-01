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
  onBack: () => void;
  /** 메인 관리자가 아닌 멤버가 나가기 확인 창에서 「나가기」를 눌렀을 때 */
  onLeave: () => void;
};

/**
 * 번치 더보기 메뉴(기능명세 5.4): 역할별 메뉴. 메인 관리자만 프로필 편집·번치 삭제
 * 프로필 편집·멤버 관리는 링크, 나머지 관리 화면은 후속 이슈라 나가기 확인 창 외 동작 미연결
 */
export function BunchMenuScreen({ bunchName, myRole, onBack, onLeave }: BunchMenuScreenProps) {
  const [leaveOpen, setLeaveOpen] = useState(false);
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
              <MenuLabel>멤버 초대</MenuLabel>
            </li>
            <li>
              <MenuLabel>차단 목록</MenuLabel>
            </li>
          </ul>
          <MenuDivider className="mx-padding-p8" />
          <ul className="gap-s2 px-padding-p8 flex flex-col">
            <li>
              {/* 메인 관리자는 새 관리자 지정 화면으로 이동(번치 나가기 이슈) */}
              <MenuLabel onClick={isOwner ? undefined : () => setLeaveOpen(true)}>
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
    </PageShell>
  );
}
