'use client';

import { LineDotsLargeIcon, toast } from '@app/design-system';
import { ConfirmSheet, MoreMenuSheet, ReportSheet } from '@app/design-system/web';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_REPORT_OTHER, BUNCH_REPORT_REASONS } from '../../constants/report';
import { headerIconLinkClass } from '../BunchHomeHeader';

type Sheet = 'menu' | 'block' | 'report';

type OtherBunchMoreMenuProps = {
  bunchName: string;
  /** 신고하는 쪽(지금 내 번치) 이름. 아직 모르면 빈 글자 */
  reporterName: string;
  onBlock: () => void;
  onReport: (_value: { reason: string; detail: string }) => void;
};

/**
 * 다른 번치 프로필 헤더 더보기(화면설계서 2500:67470·2500:69551): 차단하기·신고하기·취소하기 메뉴 시트
 * 차단은 확인 시트(Bottom Sheet 05), 신고는 사유 시트(07). 메뉴가 다 닫힌 뒤 다음 시트를 열어 초점이 꼬이지 않게 함
 */
export function OtherBunchMoreMenu({
  bunchName,
  reporterName,
  onBlock,
  onReport,
}: OtherBunchMoreMenuProps) {
  const [open, setOpen] = useState<Sheet | null>(null);
  // 메뉴에서 고른 다음 시트(메뉴가 닫힌 뒤 연다)
  const next = useRef<Sheet | null>(null);
  const reported = useRef(false);
  const openAfterMenu = (sheet: Sheet) => {
    next.current = sheet;
    setOpen(null);
  };
  const sheetProps = (sheet: Sheet) => ({
    open: open === sheet,
    onOpenChange: (nextOpen: boolean) => setOpen(nextOpen ? sheet : null),
  });

  return (
    <>
      <button
        type="button"
        aria-label="더보기"
        aria-haspopup="dialog"
        className={headerIconLinkClass}
        onClick={() => setOpen('menu')}
      >
        <LineDotsLargeIcon />
      </button>
      <MoreMenuSheet
        {...sheetProps('menu')}
        onOpenChangeComplete={(isOpen) => {
          if (isOpen || !next.current) return;
          setOpen(next.current);
          next.current = null;
        }}
        items={[
          // 기능명세 5.10.4: 차단은 멤버 누구나(해제는 메인·공동 관리자)
          { id: 'block', label: '차단하기', onSelect: () => openAfterMenu('block') },
          { id: 'report', label: '신고하기', onSelect: () => openAfterMenu('report') },
        ]}
      />
      <ConfirmSheet
        {...sheetProps('block')}
        title={BUNCH_HOME_MESSAGES.blockQuestion(bunchName)}
        notice={BUNCH_HOME_MESSAGES.blockNotice}
        // Figma 4713:86366: 92px 자리에 일러스트(object-contain)
        illustration={
          <Image
            src="/images/block-bunch-sheet.png"
            alt=""
            width={92}
            height={92}
            className="size-full object-contain"
          />
        }
        confirmLabel="차단하기"
        onConfirm={() => {
          setOpen(null);
          // 차단하면 화면이 접근 제한으로 바뀌어 이 메뉴가 사라지므로 닫힘을 기다리지 않음
          onBlock();
          toast(BUNCH_HOME_MESSAGES.blockedDone(bunchName), { fullWidth: true });
        }}
      />
      <ReportSheet
        {...sheetProps('report')}
        title={BUNCH_HOME_MESSAGES.reportTitle(bunchName)}
        description={BUNCH_HOME_MESSAGES.reportDescription(reporterName)}
        reasons={BUNCH_REPORT_REASONS}
        detailReasonValue={BUNCH_REPORT_OTHER}
        onSubmit={(value) => {
          setOpen(null);
          onReport(value);
          reported.current = true;
        }}
        // 접수 안내는 시트가 다 닫힌 뒤(열린 시트 뒤에서 낭독이 묻히지 않게, ADR 014)
        onOpenChangeComplete={(isOpen) => {
          if (isOpen || !reported.current) return;
          reported.current = false;
          toast(BUNCH_HOME_MESSAGES.reportedDone, { fullWidth: true });
        }}
      />
    </>
  );
}
