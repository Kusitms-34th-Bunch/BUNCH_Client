'use client';

import { LineDotsLargeIcon, toast } from '@app/design-system';
import { ConfirmSheet, MoreMenuSheet, ReportSheet } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import blockedBunch from '@/shared/assets/images/empty/blocked-bunch.svg';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { REPORT_OTHER, REPORT_REASONS } from '@/shared/lib/reportReasons';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { headerIconLinkClass } from '../BunchHomeHeader';

type OtherBunchMoreMenuProps = {
  bunchName: string;
  /** 신고하는 쪽(지금 내 번치) 이름. 아직 모르면 빈 글자 */
  reporterName: string;
  /** 차단 시작(확인 시트가 다 닫힌 뒤 부름). 처리 중 표시·완료 안내·실패 안내는 부르는 쪽 */
  onBlock: () => void;
  /** 신고 접수. 결과 안내(성공·실패)는 시트가 다 닫힌 뒤 이 메뉴가 띄움 */
  onReport: (_value: { reason: string; detail: string }) => Promise<unknown>;
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
  const openOverlay = useScreenOverlay();

  const openBlock = () => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmSheet
          {...rootProps}
          title={BUNCH_HOME_MESSAGES.blockQuestion(bunchName)}
          notice={BUNCH_HOME_MESSAGES.blockNotice}
          // Figma 5402:122972: 92px 자리 가운데에 일러스트 72×72
          illustration={
            <div className="flex size-full items-center justify-center">
              <Image src={blockedBunch as StaticImageData} alt="" width={72} height={72} />
            </div>
          }
          confirmLabel="차단하기"
          onConfirm={() => {
            confirmed = true;
            close();
          }}
        />
      ),
      // 시트가 다 닫힌 뒤 시작(초점 복원·화면 전환이 닫힘 애니메이션과 겹치지 않게, ADR 014)
      () => {
        if (confirmed) onBlock();
      },
    );
  };

  const openReport = () => {
    // 성공 여부(시트가 닫히기 전에 끝나도 결과를 잃지 않게 바로 받아 둠)
    let result: Promise<boolean> | undefined;
    openOverlay(
      (rootProps, close) => (
        <ReportSheet
          {...rootProps}
          title={BUNCH_HOME_MESSAGES.reportTitle(bunchName)}
          description={BUNCH_HOME_MESSAGES.reportDescription(reporterName)}
          reasons={REPORT_REASONS}
          detailReasonValue={REPORT_OTHER}
          onSubmit={(value) => {
            close();
            result = onReport(value).then(
              () => true,
              () => false,
            );
          }}
        />
      ),
      // 접수 안내는 시트가 다 닫히고 서버 접수가 끝난 뒤(열린 시트 뒤에서 낭독이 묻히지 않게, ADR 014)
      () => {
        void result?.then((ok) =>
          toast(ok ? BUNCH_HOME_MESSAGES.reportedDone : BUNCH_HOME_MESSAGES.reportFailed),
        );
      },
    );
  };

  const openMenu = () => {
    let next: (() => void) | undefined;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          items={[
            // 기능명세 5.10.4: 차단은 멤버 누구나(해제는 메인·공동 관리자)
            {
              id: 'block',
              label: '차단하기',
              onSelect: () => {
                next = openBlock;
                close();
              },
            },
            {
              id: 'report',
              label: '신고하기',
              onSelect: () => {
                next = openReport;
                close();
              },
            },
          ]}
        />
      ),
      () => next?.(),
    );
  };

  return (
    <button
      type="button"
      aria-label="더보기"
      aria-haspopup="dialog"
      className={headerIconLinkClass}
      onClick={openMenu}
    >
      <LineDotsLargeIcon />
    </button>
  );
}
