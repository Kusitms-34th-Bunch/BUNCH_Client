'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchProfileEdits } from '../hooks/useBunchProfileEdits';
import { useCurrentBunchId } from '../hooks/useCurrentBunchId';
import { BunchProfileEditScreen } from './BunchProfileEditScreen';

// 토스트가 편집 화면에서 뜨는 것을 보여 준 뒤 이동하는 시간(사용자 결정, 토스트는 메인탭에서 마저 사라짐)
const RETURN_AFTER_SAVE_MS = 1000;

/**
 * `/bunch/menu/profile` 번치 프로필 편집: 고른 fixture 번치가 초기값, 메인 관리자가 아니면 더보기 메뉴로
 * 저장하면 잠깐 뒤 바뀐 값이 반영된 번치 메인탭으로 이동(화면설계서 2145:39607 6-1·6-2)
 */

export function BunchProfileEdit() {
  const router = useRouter();
  const [currentId] = useCurrentBunchId();
  const [edits, saveEdit] = useBunchProfileEdits();
  const returnTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 첫 hydration은 저장된 번치를 몰라 폼을 그리지 않음(다른 번치 값이 잠깐 보이지 않게)
  const bunch =
    currentId === null ? undefined : (bunchDetailsFixture[currentId] ?? initialBunchDetailFixture);
  const isOwner = bunch?.myRole === 'owner';

  useEffect(() => () => clearTimeout(returnTimer.current), []);

  useEffect(() => {
    if (bunch && !isOwner) router.replace(BUNCH_HOME_PATHS.menu);
  }, [bunch, isOwner, router]);

  return (
    <BunchProfileEditScreen
      // 번치가 바뀌면 입력 상태를 새 초기값으로
      key={bunch?.id}
      initial={isOwner ? { ...bunch, ...edits[bunch.id] } : undefined}
      onBack={() => {
        // 저장 뒤 예약된 메인탭 이동과 겹치지 않게 취소
        clearTimeout(returnTimer.current);
        if (window.history.length > 1) router.back();
        else router.replace(BUNCH_HOME_PATHS.menu);
      }}
      onSaved={(profile) => {
        if (!bunch) return;
        saveEdit(bunch.id, profile);
        clearTimeout(returnTimer.current);
        returnTimer.current = setTimeout(
          () => router.replace(BUNCH_HOME_PATHS.home),
          RETURN_AFTER_SAVE_MS,
        );
      }}
    />
  );
}
