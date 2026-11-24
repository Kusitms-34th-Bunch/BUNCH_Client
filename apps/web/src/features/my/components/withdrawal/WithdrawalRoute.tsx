'use client';

import { ActionDialog, toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { markTransferFromGuide } from '../../lib/withdrawalFlow';
import { useFetchOwnedBunches, useWithdrawMutation } from '../../queries/withdrawal';
import { PendingConfirmDialog } from '../PendingConfirmDialog';
import { WithdrawalScreen } from './WithdrawalScreen';

const text = MY_MESSAGES.withdrawal;

/**
 * 회원 탈퇴 안내와 탈퇴 API를 잇는 컨테이너
 * 「다음」을 누를 때마다 넘길 번치를 서버에서 새로 확인해, 있으면 권한 이전 안내, 없으면 최종 확인 뒤 탈퇴
 */
export function WithdrawalRoute() {
  const router = useRouter();
  const backOr = useBackOr();
  const openOverlay = useScreenOverlay();
  const withdraw = useWithdrawMutation();
  const fetchOwnedBunches = useFetchOwnedBunches();
  // 확인 요청 중 표시와 다시 누르기 방지(버튼을 disabled로 바꾸면 초점이 빠져서 ref로 막음)
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  // 확인 요청 중 화면을 떠났으면 결과로 창을 열지 않음(떠난 화면의 창이 다른 화면 위에 남지 않게)
  const mounted = useMountedRef();
  // 최종 확인 창이 다 닫힌 뒤 할 일(안내 창 열기·토스트). 닫히는 창의 초점 복귀와 겹치지 않게 미룸
  const afterConfirmClosed = useRef<(() => void) | undefined>(undefined);
  const openConfirm = () =>
    openOverlay(
      (rootProps) => (
        <PendingConfirmDialog
          {...rootProps}
          title={text.confirmTitle}
          description={text.confirmDescription}
          cancelLabel={MY_MESSAGES.cancel}
          confirmLabel={text.confirm}
          run={(close) => void confirmWithdraw(close)}
        />
      ),
      () => {
        const run = afterConfirmClosed.current;
        afterConfirmClosed.current = undefined;
        run?.();
      },
    );
  const openOwner = () =>
    openOverlay((rootProps, close) => (
      <ActionDialog
        {...rootProps}
        title={text.ownerTitle}
        description={text.ownerDescription}
        actions={[
          {
            label: text.ownerTransfer,
            onClick: () => {
              close();
              markTransferFromGuide();
              router.push(MY_PATHS.withdrawalTransfer);
            },
          },
        ]}
        cancelLabel={MY_MESSAGES.cancel}
        cancelAppearance="solid"
      />
    ));
  // 탈퇴 직전에 한 번 더 확인해, 그사이 메인 관리자 번치가 생겼으면 권한 이전 안내로 바꿈(기능명세서 7.6.4 로직 1)
  const confirmWithdraw = async (close: () => void) => {
    let owned;
    try {
      owned = await fetchOwnedBunches();
    } catch {
      afterConfirmClosed.current = () => toast(text.failed);
      close();
      return;
    }
    if (owned.length > 0) {
      afterConfirmClosed.current = openOwner;
      close();
      return;
    }
    // Apple 재인증 창을 닫았으면 확인 창도 닫고 이 화면에 머묾
    withdraw.mutate(undefined, {
      onError: close,
      onSuccess: (result) => {
        if (result === 'cancelled') close();
      },
    });
  };
  // 권한을 넘기고 돌아와도 다시 확인해 남은 번치로 판단(화면 설계서 5-3)
  const next = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const owned = await fetchOwnedBunches();
      if (!mounted.current) return;
      if (owned.length > 0) openOwner();
      else openConfirm();
    } catch {
      if (mounted.current) toast(text.failed);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  };

  return (
    <>
      {/* 확인 요청 중임을 스크린 리더에 알림(늘 두고 글만 바꿈) */}
      <p role="status" className="sr-only">
        {checking ? text.checking : ''}
      </p>
      <WithdrawalScreen
        checking={checking}
        onNext={() => void next()}
        onBack={() => backOr(MY_PATHS.home)}
      />
    </>
  );
}
