'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { loadFailed } from '@/shared/query/loadFailed';
import type { OwnedBunch } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { consumeTransferFromGuide, markKeepAgreed } from '../../lib/withdrawalFlow';
import {
  ownedBunchesQueryOptions,
  useOwnedBunchImage,
  useTransferOwnershipMutation,
} from '../../queries/withdrawal';
import { AdminTransferScreen, type TransferSelections } from './AdminTransferScreen';

const text = MY_MESSAGES.transfer;

/**
 * 관리자 권한 이전 화면과 넘길 번치·권한 이전 API를 잇는 컨테이너
 * 넘긴 뒤 탈퇴 안내로 복귀, 받기 실패·넘길 번치 없음이면 탈퇴 안내로 돌아감(spec)
 */
export function AdminTransferRoute() {
  const router = useRouter();
  const backOr = useBackOr();
  // 탈퇴 안내에서 왔으면 완료 뒤 뒤로 가기, 주소로 바로 들어왔으면 탈퇴 안내로 교체 이동
  const [fromGuide] = useState(consumeTransferFromGuide);
  const owned = useQuery(ownedBunchesQueryOptions());
  const bunchImageOf = useOwnedBunchImage();
  const transfer = useTransferOwnershipMutation();
  // 보내는 동안·넘긴 뒤 돌아가는 전환 동안은 누른 순간의 목록을 유지(다시 받은 목록이 비어도 화면이 바뀌지 않게)
  const [frozen, setFrozen] = useState<readonly OwnedBunch[]>();
  const bunches = frozen ?? owned.data ?? [];
  // 돌아가는 전환 중 다시 눌러 두 화면을 되돌아가지 않도록 막음
  const [done, setDone] = useState(false);
  // 보내는 중 다시 누르기 방지(버튼을 disabled로 바꾸면 초점이 빠져서 ref로 막음)
  const sending = useRef(false);
  const failed = loadFailed(owned);
  // 넘길 번치가 없음(그사이 모두 넘어감·나 혼자 남음): 이 화면에 남을 이유가 없어 탈퇴 안내로
  const empty = owned.data?.length === 0 && frozen === undefined && !done;
  const left = useRef(false);
  useEffect(() => {
    if ((!failed && !empty) || left.current) return;
    left.current = true;
    if (failed) toastAfterNavigation(MY_MESSAGES.withdrawal.failed);
    else markKeepAgreed(fromGuide);
    backOr(MY_PATHS.withdrawal);
  }, [failed, empty, fromGuide, backOr]);

  const submit = (selections: TransferSelections) => {
    if (sending.current) return;
    sending.current = true;
    setFrozen(bunches);
    transfer.mutate(
      { bunches, selections },
      {
        onSuccess: () => {
          setDone(true);
          markKeepAgreed(fromGuide);
          if (fromGuide) router.back();
          else router.replace(MY_PATHS.withdrawal);
        },
        // 다시 받은 목록(남은 번치·새 버전)으로 다시 고르게 함
        onError: () => {
          sending.current = false;
          setFrozen(undefined);
        },
      },
    );
  };

  const loading = owned.data === undefined && frozen === undefined;

  return (
    <>
      {/* 받는 중·보내는 중을 스크린 리더에 알림(받는 중과 화면이 바뀌어도 같은 자리에 늘 두어 읽히게) */}
      <p role="status" className="sr-only">
        {loading && owned.isPending ? text.loading : transfer.isPending ? text.sending : ''}
      </p>
      {/* 받지 못해 돌아가는 중에는 아무것도 그리지 않음(Screen이 빠지면 고른 값도 초기화, 이 분기는 고른 값이 없을 때뿐) */}
      {loading && !owned.isPending ? null : (
        <AdminTransferScreen
          bunches={bunches}
          loading={loading}
          sending={transfer.isPending}
          done={done}
          bunchImageOf={bunchImageOf}
          onSubmit={submit}
          onBack={() => {
            // 이미 떠났으면 받기 실패·빈 목록 effect가 한 번 더 뒤로 가지 않게
            left.current = true;
            backOr(MY_PATHS.withdrawal);
          }}
        />
      )}
    </>
  );
}
