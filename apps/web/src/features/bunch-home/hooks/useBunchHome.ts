import { useMemo, useState } from 'react';
import type { BunchHomeActions, BunchHomeData } from '../lib/types';
import {
  bunchDetailsFixture,
  bunchSummariesFixture,
  initialBunchDetailFixture,
} from '../fixtures/bunchHome.fixture';
import { useBunchMembers } from './useBunchMembers';
import { useBunchProfileEdits } from './useBunchProfileEdits';
import { useCurrentBunchId } from './useCurrentBunchId';

type UseBunchHomeResult = {
  /** 참여 중인 번치가 하나도 없으면 null(번치 없음, 기능명세 5.1.7) */
  data: BunchHomeData | null;
  actions: BunchHomeActions;
};

/**
 * 번치 홈 상태와 동작의 호출 지점. 번치·번들 API 연결 전에는 fixture와 목 동작을 돌려줌
 * 연결하면 이 hook만 TanStack Query 상태(로딩·오류 포함)와 mutation으로 바꿈
 */
export function useBunchHome(): UseBunchHomeResult {
  const [storedId, setCurrentId] = useCurrentBunchId();
  // 첫 hydration은 기본 번치(번치 홈은 역할별 항목이 없어 그대로 그림)
  const currentId = storedId ?? initialBunchDetailFixture.id;
  const [bunches, setBunches] = useState(bunchSummariesFixture);
  const [deletedDraftIds, setDeletedDraftIds] = useState<ReadonlySet<string>>(new Set());
  // 프로필 편집에서 저장한 값을 fixture 위에 덮어씀(이름·대표 사진은 전환 목록에도)
  const [profileEdits] = useBunchProfileEdits();
  // 멤버 관리에서 내보낸 결과를 멤버 수에 반영
  const { members } = useBunchMembers(currentId);

  const data = useMemo<BunchHomeData | null>(() => {
    const detail = bunchDetailsFixture[currentId] ?? initialBunchDetailFixture;
    // 지금 번치를 맨 위에 두고 나머지는 받은 순서(서버가 최근 사용순으로 줄 예정, 기능명세 5.2.1)
    const edited = bunches.map((bunch) => {
      const edit = profileEdits[bunch.id];
      return edit ? { ...bunch, name: edit.name, imageSrc: edit.imageSrc } : bunch;
    });
    const current = edited.filter((bunch) => bunch.id === currentId);
    const others = edited.filter((bunch) => bunch.id !== currentId);
    return {
      current: {
        ...detail,
        ...profileEdits[currentId],
        memberCount: members?.length ?? detail.memberCount,
        draftBundles: detail.draftBundles.filter((bundle) => !deletedDraftIds.has(bundle.id)),
      },
      bunches: [...current, ...others],
    };
  }, [currentId, bunches, deletedDraftIds, profileEdits, members]);

  const actions: BunchHomeActions = {
    switchBunch: setCurrentId,
    deleteDraftBundle: (bundleId) => setDeletedDraftIds((ids) => new Set(ids).add(bundleId)),
    removeBunch: (bunchId) =>
      setBunches((current) => current.filter((bunch) => bunch.id !== bunchId)),
  };

  return { data, actions };
}
