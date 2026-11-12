'use client';

import { ConfirmDialog, Header, LineChevronRightLargeIcon, toast } from '@app/design-system';
import { MenuLabel, ProfileImage } from '@app/design-system/web';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { openExternal } from '../../lib/navigation';
import { useLogoutMutation } from '../../queries/session';
import { PendingConfirmDialog } from '../PendingConfirmDialog';

type ConfirmKind = 'contact' | 'logout';
type MenuItem = { label: string; href?: string; dialog?: ConfirmKind };

// 화면 이동 메뉴는 링크, 문의하기·로그아웃은 확인 창을 여는 버튼
const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: MY_MESSAGES.sections.notifications,
    items: [{ label: MY_MESSAGES.menu.notifications, href: MY_PATHS.notifications }],
  },
  {
    title: MY_MESSAGES.sections.terms,
    items: [
      { label: MY_MESSAGES.menu.termsOfService, href: MY_PATHS.termsOfService },
      { label: MY_MESSAGES.menu.privacyPolicy, href: MY_PATHS.privacyPolicy },
    ],
  },
  {
    title: MY_MESSAGES.sections.support,
    items: [
      { label: MY_MESSAGES.menu.contact, dialog: 'contact' },
      { label: MY_MESSAGES.menu.logout, dialog: 'logout' },
      { label: MY_MESSAGES.menu.withdrawal, href: MY_PATHS.withdrawal },
    ],
  },
];

type MyScreenProps = {
  profile: MyProfile;
  /** 문의하기 카카오톡 상담 채널 주소. 없으면 확인 창의 「열기」를 막음(출시 전 주소 확정 때 넣음) */
  contactUrl?: string | undefined;
};

/**
 * MY 탭 첫 화면(화면 설계서 MY(1)·(4)): 내 프로필과 메뉴 묶음 3개, 문의하기·로그아웃 확인 창
 * 프로필은 호출하는 쪽이 전달(`MyRoute`가 내 정보 API로 받아 넘김)
 */
export function MyScreen({ profile, contactUrl }: MyScreenProps) {
  const openOverlay = useScreenOverlay();
  const openConfirm = (kind: ConfirmKind) =>
    kind === 'contact'
      ? openOverlay((rootProps, close) => (
          <ConfirmDialog
            {...rootProps}
            title={MY_MESSAGES.contact.title}
            description={MY_MESSAGES.contact.description}
            cancelLabel={MY_MESSAGES.cancel}
            confirmLabel={MY_MESSAGES.contact.confirm}
            confirmDisabled={!contactUrl}
            onConfirm={() => {
              close();
              // 링크를 열지 못하면 오류 토스트(기능명세서 7.5.1 예외)
              if (contactUrl && !openExternal(contactUrl)) toast(MY_MESSAGES.contact.failed);
            }}
          />
        ))
      : openOverlay((rootProps) => (
          <PendingConfirmDialog
            {...rootProps}
            title={MY_MESSAGES.logout.title}
            cancelLabel={MY_MESSAGES.cancel}
            confirmLabel={MY_MESSAGES.logout.confirm}
            run={(onError) => logout.mutate(undefined, { onError })}
          />
        ));
  const logout = useLogoutMutation();

  return (
    <PageShell header={<Header title={<h1 className="truncate">{MY_MESSAGES.title}</h1>} />}>
      {/* 헤더 아래 12, 프로필과 메뉴 사이 20(Figma 4096:75220) */}
      <div className="gap-s10 pt-padding-p6 flex flex-col">
        <Link
          href={MY_PATHS.profile}
          className="px-padding-p8 py-padding-p5 gap-s5 before:bg-overlay-hover focus-visible:outline-border-brand relative isolate flex touch-manipulation items-center before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 active:before:opacity-100 motion-reduce:before:transition-none"
        >
          <ProfileImage
            src={profile.imageSrc ?? DEFAULT_PROFILE_IMAGE}
            size="M"
            className="border-border-tertiary border"
          />
          <span className="typography-body-1-semi-bold text-text-primary min-w-0 flex-1 truncate">
            {profile.nickname}
            <span className="sr-only">
              {profile.nickname ? ` ${MY_MESSAGES.profileEdit}` : MY_MESSAGES.profileEditOwn}
            </span>
          </span>
          <LineChevronRightLargeIcon className="text-icon-quaternary shrink-0" />
        </Link>
        <div className="gap-s6 flex flex-col">
          {MENU_SECTIONS.map((section) => (
            <MenuSection key={section.title} title={section.title}>
              {section.items.map(({ label, href, dialog }) => (
                <li key={label}>
                  {href ? (
                    <MenuLabel
                      renderLink={({ className, children }) => (
                        <Link href={href} className={className}>
                          {children}
                        </Link>
                      )}
                    >
                      {label}
                    </MenuLabel>
                  ) : (
                    <MenuLabel onClick={() => dialog && openConfirm(dialog)}>{label}</MenuLabel>
                  )}
                </li>
              ))}
            </MenuSection>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

/** 묶음 제목과 메뉴 목록. 제목 아래 4, 목록 좌우 12(메뉴 안쪽 4와 더해 16) */
function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    // 이름 붙은 region으로 두면 토스트 영역(「알림」)과 같은 이름의 랜드마크가 생겨 h2 제목만 둔 묶음으로
    <section className="gap-s2 flex flex-col">
      <h2 className="typography-body-4-semi-bold text-text-tertiary px-padding-p8 py-padding-p3">
        {title}
      </h2>
      <ul className="px-padding-p6 flex flex-col">{children}</ul>
    </section>
  );
}
