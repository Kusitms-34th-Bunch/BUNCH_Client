'use client';

import {
  ConfirmDialog,
  Header,
  LineChevronLeftLargeIcon,
  Toggle,
  type ConfirmDialogProps,
} from '@app/design-system';
import { MenuLabel } from '@app/design-system/web';
import Link from 'next/link';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useScreenOverlay, type ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { MenuSection } from '../MenuSection';

type TermsAndPrivacyScreenProps = {
  /** 추가 개인정보 수집·이용 동의 상태 */
  consent: boolean;
  /** 확인 창에서 「동의하기」·「동의 철회」를 눌렀을 때 저장 시작. 끝나면(성공·실패 모두) `done`을 불러 창을 닫음 */
  onChangeConsent: (_agreed: boolean, _done: () => void) => void;
};

/**
 * 약관 및 개인정보(화면 설계서 MY(4), 기능명세서 7.4.4·7.4.5): 약관 원문 이동과 추가 개인정보 수집 동의 토글
 * 토글은 누르는 순간 바뀌지 않고 확인 창에서 확인해야 바뀜. 확인 창은 저장 중에 닫거나 다시 누를 수 없음
 */
export function TermsAndPrivacyScreen({ consent, onChangeConsent }: TermsAndPrivacyScreenProps) {
  const backOr = useBackOr();
  const openOverlay = useScreenOverlay();
  const titleId = useId();
  const text = MY_MESSAGES.termsSettings;
  const demographics = text.demographics;

  const openConfirm = (nextAgreed: boolean) => {
    const copy = nextAgreed ? demographics.agree : demographics.withdraw;
    openOverlay((rootProps, close) => (
      <SavingConfirmDialog
        {...rootProps}
        title={copy.title}
        description={copy.description}
        cancelLabel={MY_MESSAGES.cancel}
        confirmLabel={copy.confirm}
        run={(done) =>
          onChangeConsent(nextAgreed, () => {
            done();
            close();
          })
        }
      />
    ));
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 약관 및 개인정보 헤더 뒤로 가기 아이콘 색(#535A61, icon-tertiary). 다른 MY 하위 화면의 연한 회색(#bcbec2)과 다름
            <HeaderIconButton
              label="뒤로 가기"
              tone="tertiary"
              onClick={() => backOr(MY_PATHS.home)}
            >
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{text.title}</h1>
      {/* 헤더 아래 12, 묶음 사이 24(MY 메뉴와 같은 간격) */}
      <div className="gap-s6 pt-padding-p6 flex flex-col">
        <MenuSection title={text.termsSection}>
          <li>
            <MenuLink href={MY_PATHS.termsOfService}>{MY_MESSAGES.menu.termsOfService}</MenuLink>
          </li>
        </MenuSection>
        <MenuSection title={text.privacySection}>
          <li>
            <MenuLink href={MY_PATHS.privacyPolicy}>{MY_MESSAGES.menu.privacyPolicy}</MenuLink>
          </li>
          <li className="px-s2 py-padding-p5 gap-s4 flex items-center justify-between">
            <span className="gap-s2 flex min-w-0 flex-col items-start">
              <span
                id={titleId}
                className="typography-body-2-medium text-text-secondary wrap-break-word break-keep"
              >
                {demographics.title}
              </span>
              <Link
                href={MY_PATHS.demographicsTerms}
                className="typography-caption-1-regular text-text-tertiary focus-visible:outline-border-brand cursor-pointer touch-manipulation underline decoration-from-font [text-underline-position:from-font] focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {demographics.viewFull}
                <span className="sr-only"> {demographics.title}</span>
              </Link>
            </span>
            {/* 누른 값으로 바로 바뀌지 않게 상태는 서버 값만 따르고, 누르면 확인 창을 엶 */}
            <Toggle
              aria-labelledby={titleId}
              checked={consent}
              onChange={(event) => openConfirm(event.currentTarget.checked)}
            />
          </li>
        </MenuSection>
      </div>
    </PageShell>
  );
}

function MenuLink({ href, children }: { href: string; children: string }) {
  return (
    <MenuLabel
      renderLink={({ className, children: content }) => (
        <Link href={href} className={className}>
          {content}
        </Link>
      )}
    >
      {children}
    </MenuLabel>
  );
}

type SavingConfirmDialogProps = ScreenOverlayProps &
  Pick<ConfirmDialogProps, 'title' | 'description' | 'cancelLabel' | 'confirmLabel'> & {
    /** 저장 시작. 끝나면(성공·실패 모두) `done`을 불러야 함 */
    run: (_done: () => void) => void;
  };

/** 저장하는 동안 취소·ESC로 닫지 않고 다시 누르지 못하는 확인 창(연타는 첫 탭만 처리, 기능명세서 7.4.5) */
function SavingConfirmDialog({ run, ...props }: SavingConfirmDialogProps) {
  const [saving, setSaving] = useState(false);
  return (
    <ConfirmDialog
      {...props}
      onOpenChange={(open) => {
        if (!saving) props.onOpenChange(open);
      }}
      confirmDisabled={saving}
      onConfirm={() => {
        if (saving) return;
        setSaving(true);
        run(() => setSaving(false));
      }}
    />
  );
}
