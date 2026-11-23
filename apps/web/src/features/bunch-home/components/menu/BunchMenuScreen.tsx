'use client';

import { ConfirmDialog, Header, LineChevronLeftLargeIcon, Skeleton } from '@app/design-system';
import { MenuDivider, MenuLabel } from '@app/design-system/web';
import Link from 'next/link';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import type { BunchRole } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';

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
  /** 나만 남은 번치 안내의 「삭제하기」(번치 삭제 화면으로) */
  onDeleteBunch?: (() => void) | undefined;
  /** 「멤버 초대」를 누르기 시작하거나 초점이 갔을 때(초대 링크 미리 받기) */
  onInviteIntent?: (() => void) | undefined;
};

// 역할을 알기 전 메뉴 자리(위 묶음 4줄·아래 1줄). Figma에 없는 상태라 다른 스켈레톤과 같은 회색
const SKELETON_TOP_ROWS = [0, 1, 2, 3];

/**
 * 번치 더보기 메뉴(기능명세 5.4): 역할별 메뉴. 메인 관리자만 프로필 편집·번치 삭제
 * 나가기는 역할별(일반 멤버·공동 관리자 확인 창, 메인 관리자 지정 화면, 나만 남으면 삭제 안내)
 */
export function BunchMenuScreen({
  bunchName,
  myRole,
  alone = false,
  onBack,
  onLeave,
  onOwnerLeave,
  onDeleteBunch,
  onInviteIntent,
}: BunchMenuScreenProps) {
  const openOverlay = useScreenOverlay();
  const openLeave = () =>
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNCH_HOME_MESSAGES.leaveTitle(bunchName ?? '')}
        description={BUNCH_HOME_MESSAGES.leaveDescription}
        cancelLabel="취소"
        confirmLabel="나가기"
        onConfirm={() => {
          close();
          onLeave();
        }}
      />
    ));
  const openAlone = () =>
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNCH_HOME_MESSAGES.aloneTitle}
        description={BUNCH_HOME_MESSAGES.aloneDescription}
        cancelLabel="취소"
        confirmLabel={BUNCH_HOME_MESSAGES.aloneConfirm}
        onConfirm={() => {
          close();
          onDeleteBunch?.();
        }}
      />
    ));
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
      {/* 늘 있는 상태 영역의 글자만 바꿈(새로 붙인 영역은 낭독이 안 될 수 있음) */}
      <p role="status" className="sr-only">
        {myRole ? '' : BUNCH_HOME_MESSAGES.menuLoading}
      </p>
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
                  <Link
                    href={BUNCH_HOME_PATHS.invite}
                    className={className}
                    onPointerDown={onInviteIntent}
                    onFocus={onInviteIntent}
                  >
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
                  if (alone) openAlone();
                  else if (isOwner) onOwnerLeave?.();
                  else openLeave();
                }}
              >
                번치 나가기
              </MenuLabel>
            </li>
            {isOwner ? (
              <li>
                <MenuLabel
                  renderLink={({ className, children }) => (
                    <Link href={BUNCH_HOME_PATHS.delete} className={className}>
                      {children}
                    </Link>
                  )}
                >
                  번치 삭제
                </MenuLabel>
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <div className="pt-padding-p6">
          {/* 메뉴와 같은 간격(항목 사이 4, 묶음과 구분선 사이 12). 역할을 몰라 줄 수는 대표값(위 4줄·아래 1줄) */}
          <div aria-hidden="true" className="gap-s6 flex flex-col">
            <div className="gap-s2 px-padding-p8 flex flex-col">
              {SKELETON_TOP_ROWS.map((row) => (
                <div key={row} className="px-s2 py-padding-p5">
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
            <MenuDivider className="mx-padding-p8" />
            <div className="px-padding-p8">
              <div className="px-s2 py-padding-p5">
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
