'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BUNCH_HOME_TOAST_OFFSET } from '../../constants/toast';
import { useBunchProfileEdits } from '../../hooks/useBunchProfileEdits';
import { useCurrentBunch } from '../../hooks/useCurrentBunch';
import { BunchProfileEditScreen } from './BunchProfileEditScreen';

/**
 * `/bunch/menu/profile` 번치 프로필 편집: 고른 fixture 번치가 초기값, 메인 관리자가 아니면 더보기 메뉴로
 * 저장하면 바로 바뀐 값이 반영된 번치 메인탭으로 이동하고 거기서 토스트(화면설계서 2145:39607 6, 사용자 결정)
 */
export function BunchProfileEdit() {
  const router = useRouter();
  const backOr = useBackOr();
  const [edits, saveEdit] = useBunchProfileEdits();
  // 첫 hydration은 저장된 번치를 몰라 폼을 그리지 않음(다른 번치 값이 잠깐 보이지 않게)
  // 멤버 관리에서 메인 관리자를 넘겼으면 바뀐 역할 기준
  const { bunch, myRole } = useCurrentBunch();
  const isOwner = myRole === 'owner';

  useEffect(() => {
    if (bunch && !isOwner) router.replace(BUNCH_HOME_PATHS.menu);
  }, [bunch, isOwner, router]);

  return (
    <BunchProfileEditScreen
      // 번치가 바뀌면 입력 상태를 새 초기값으로
      key={bunch?.id}
      initial={bunch && isOwner ? { ...bunch, ...edits[bunch.id] } : undefined}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
      onSaved={(profile) => {
        if (!bunch) return;
        saveEdit(bunch.id, profile);
        router.replace(BUNCH_HOME_PATHS.home);
        // 메인탭의 「+」 옆 높이(번치 전환 토스트와 같은 자리)
        toast(BUNCH_HOME_MESSAGES.profileSaved, {
          icon: 'success',
          fullWidth: true,
          bottomOffset: BUNCH_HOME_TOAST_OFFSET,
        });
      }}
    />
  );
}
