'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { BUNCH_HOME_TOAST_OFFSET } from '../constants/toast';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchMembers } from '../hooks/useBunchMembers';
import { useCurrentBunchId } from '../hooks/useCurrentBunchId';
import { leaveBunch } from '../hooks/useLeftBunches';
import { BunchLeaveScreen } from './BunchLeaveScreen';

/**
 * `/bunch/menu/leave` 메인 관리자의 나가기: 새 관리자 지정 뒤 남은 번치의 번치 탭으로(남은 번치가 없으면 번치 없음)
 * 메인 관리자가 아니거나 나만 남았으면 더보기 메뉴로(접근 제어가 아니라 API 전 임시 처리)
 */
export function BunchLeave() {
  const router = useRouter();
  const [currentId, setCurrentId] = useCurrentBunchId();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음
  const bunch =
    currentId === null ? undefined : (bunchDetailsFixture[currentId] ?? initialBunchDetailFixture);
  const { members, myRole } = useBunchMembers(bunch?.id);
  const role = myRole ?? bunch?.myRole;
  // Figma 1892:36323은 역할과 상관없이 이름순(멤버 관리의 역할순과 다름)
  const candidates = members
    ?.filter((member) => !member.isMe)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const canTransfer = role === 'owner' && candidates !== undefined && candidates.length > 0;

  // 나간 뒤 다음 번치로 바뀌면 그 번치의 역할로 다시 판정되므로, 나가는 중에는 메뉴로 돌려보내지 않음
  const leaving = useRef(false);
  useEffect(() => {
    if (bunch && !canTransfer && !leaving.current) router.replace(BUNCH_HOME_PATHS.menu);
  }, [bunch, canTransfer, router]);

  return (
    <BunchLeaveScreen
      candidates={canTransfer ? candidates : undefined}
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNCH_HOME_PATHS.menu)
      }
      onTransferAndLeave={(member) => {
        if (!bunch) return;
        leaving.current = true;
        const next = leaveBunch(bunch.id);
        if (next) setCurrentId(next);
        // 들어온 길(번치 탭 → 메뉴 → 지정 화면)을 두 칸 되돌아가 뒤로 가기 대상에서 뺌(앞으로 가기에는 남음). 기록이 모자라면 replace
        if (window.history.length > 2) window.history.go(-2);
        else router.replace(BUNCH_HOME_PATHS.home);
        toast(BUNCH_HOME_MESSAGES.transferredAndLeft(member.name), {
          fullWidth: true,
          bottomOffset: BUNCH_HOME_TOAST_OFFSET,
        });
      }}
    />
  );
}
