'use client';

import { isApiError } from '@app/api-core';
import { LineAlertMediumIcon, toast } from '@app/design-system';
import { MoreMenuSheet, ReportSheet } from '@app/design-system/web';
import { isWireId } from '@/shared/api/client/ids';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { REPORT_OTHER, REPORT_REASONS } from '@/shared/lib/reportReasons';
import { FEED_MESSAGES as text } from '../constants/messages';
import { useReportMutation } from '../queries/report';

type ReportCallbacks = { onSuccess: () => void; onError: (_error: unknown) => void };

/**
 * 번들 상세의 신고 시트(명세 018·019): 남의 번들·댓글 더보기의 「신고」 메뉴와 신고 사유 시트
 * 결과 처리(숨김·이동·안내)는 호출부 콜백. 24시간 안 같은 대상 3번째(`BUNCH_011`)는 여기서 검토 중 안내
 */
export function useBundleReport({
  bundleId,
  viewerName,
  asBunch,
}: {
  bundleId: string;
  viewerName: string;
  asBunch: (_action: () => void) => void;
}) {
  const openOverlay = useScreenOverlay();
  const report = useReportMutation();

  // 신고 사유 시트(Figma `5367:121909`·`5367:122444`, 번치 신고와 같은 구성). 누르면 닫고 보냄
  // 결과 처리는 시트가 다 닫히고 접수가 끝난 뒤(열린 시트 뒤에서 낭독이 묻히지 않게, ADR 014)
  const openReport = (title: string, target: { commentId?: string }, callbacks: ReportCallbacks) =>
    asBunch(() => {
      // 앞 신고를 접수하는 중에는 새로 열지 않음(닫힌 시트 뒤에서 같은 대상을 두 번 보내지 않게)
      if (!isWireId(bundleId) || report.isPending) return;
      let result: Promise<{ ok: true } | { ok: false; error: unknown }> | undefined;
      openOverlay(
        (rootProps, close) => (
          <ReportSheet
            {...rootProps}
            title={title}
            description={text.reportAs(viewerName)}
            reasons={REPORT_REASONS}
            detailReasonValue={REPORT_OTHER}
            onSubmit={(value) => {
              // 닫히는 동안 다시 눌러도 한 번만
              if (result) return;
              close();
              // mutate 단위 콜백이라 응답 전에 화면을 떠나면 불리지 않음(떠난 뒤 한 번 더 이동하지 않게)
              result = new Promise((resolve) =>
                report.mutate(
                  { bundleId, ...target, ...value },
                  {
                    onSuccess: () => resolve({ ok: true }),
                    onError: (error) => resolve({ ok: false, error }),
                  },
                ),
              );
            }}
          />
        ),
        () => {
          void result?.then((outcome) => {
            if (outcome.ok) return callbacks.onSuccess();
            // 접수되지 않았지만 이미 신고된 대상이라 실패가 아닌 안내(명세 6.2.10·6.2.14, 재시도 없음)
            if (isApiError(outcome.error) && outcome.error.code === 'BUNCH_011') {
              toast(text.reportLimited);
              return;
            }
            callbacks.onError(outcome.error);
          });
        },
      );
    });

  // 남의 번들·댓글 더보기(Figma `5367:110378`): 「신고」/「취소」. 시트가 다 닫힌 뒤 신고 시트
  const openReportMenu = (title: string, onSelect: () => void) => {
    let chosen = false;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={title}
          cancelLabel={text.cancel}
          items={[
            {
              id: 'report',
              label: text.report,
              leftIcon: <LineAlertMediumIcon aria-hidden />,
              onSelect: () => {
                chosen = true;
                close();
              },
            },
          ]}
        />
      ),
      () => {
        if (chosen) onSelect();
      },
    );
  };

  return { openReport, openReportMenu };
}
