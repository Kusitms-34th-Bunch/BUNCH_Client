import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { readHistoryEntry, writeHistoryEntry } from '@/shared/lib/navigation/historyEntry';
import { ALL_MEMBERS, type KokPlace } from '../lib/types';
import { pinnedPlacesQueryOptions, useRemovePinnedPlaceMutation } from '../queries/pinnedPlaces';

/** 되돌리기 토스트 노출 시간이자 콕 빼기 요청을 보류하는 시간(ms) */
export const UNDO_DURATION = 5000;

// 고른 칩을 이 화면의 history 항목에 둠: 번들 상세에서 돌아오면 그 칩으로, 새로 들어오면 「전체」로(기능명세서 8.1.5 상세 2·8.1.2 로직 6)
const HISTORY_KEY = 'placesMember';
const readHistoryMember = () => {
  const value = readHistoryEntry(HISTORY_KEY);
  return typeof value === 'string' ? value : undefined;
};
const writeHistoryMember = (memberId: string) => {
  writeHistoryEntry({ [HISTORY_KEY]: memberId });
};

/**
 * 지금 번치(`bunchId`)의 콕한 장소와 멤버 칩, 콕에서 빼기·되돌리기
 * 서버에 복구 API가 없어 뺀 카드는 화면에서 먼저 숨기고 되돌리기 시간이 지나면 삭제 요청(명세 005·009, 2026-11-23 확인)
 */
export function useBunchPlaces(bunchId: string) {
  const [selectedId, setSelectedId] = useState(() => readHistoryMember() ?? ALL_MEMBERS);
  // 칩을 바꿔 새 목록을 받는 동안 보던 목록과 칩을 유지
  const [isSwitching, startSwitch] = useTransition();
  const {
    data: pages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetching,
    dataUpdatedAt,
  } = useSuspenseInfiniteQuery(pinnedPlacesQueryOptions(bunchId, selectedId));
  // 칩·개수는 첫 쪽 기준(쪽마다 같은 값), 카드는 쪽을 이어 붙이고 쪽 사이에 겹친 카드는 한 번만(받는 사이 콕이 빠져 밀린 경우)
  const first = pages.pages[0];
  const data = useMemo(() => {
    const seen = new Set<string>();
    const places = pages.pages
      .flatMap((page) => page.places)
      .filter((place) => (seen.has(place.id) ? false : (seen.add(place.id), true)));
    return {
      selectedMemberId: first?.selectedMemberId,
      totalCount: first?.totalCount ?? 0,
      members: first?.members ?? [],
      places,
    };
  }, [pages, first]);
  const { mutateAsync: removeOnServer } = useRemovePinnedPlaceMutation(bunchId);
  // 삭제 요청 전이거나 다시 받기 전인 콕(숨김). 요청이 끝나고 목록을 다시 받으면 지움
  const [hidden, setHidden] = useState<ReadonlyMap<string, string | null>>(new Map());
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // 되돌려 다시 보일 카드(화면이 초점을 옮김). 같은 카드를 다시 되돌려도 구분하도록 순번을 붙임
  const [restored, setRestored] = useState<{ id: string; seq: number }>();

  const unhide = useCallback((placeId: string) => {
    setHidden((current) => {
      const next = new Map(current);
      next.delete(placeId);
      return next;
    });
  }, []);

  const send = useCallback(
    (placeId: string) => {
      const timer = pending.current.get(placeId);
      if (timer === undefined) return;
      clearTimeout(timer);
      pending.current.delete(placeId);
      // 실패 알림은 mutation이 띄우고, 성공·실패 모두 다시 받은 목록이 카드를 정함
      void removeOnServer(placeId)
        .catch(() => undefined)
        .finally(() => unhide(placeId));
    },
    [removeOnServer, unhide],
  );

  // 화면을 떠나면 되돌리기를 더 누를 수 없으므로 보류한 빼기를 보냄
  useEffect(() => {
    const entries = pending.current;
    return () => {
      for (const placeId of [...entries.keys()]) send(placeId);
    };
  }, [send]);

  const remove = (place: KokPlace) => {
    // 새 토스트가 이전 되돌리기 토스트를 대체하므로 앞서 보류한 빼기는 바로 보냄
    for (const placeId of [...pending.current.keys()]) send(placeId);
    pending.current.set(
      place.id,
      setTimeout(() => send(place.id), UNDO_DURATION),
    );
    setHidden((current) => new Map(current).set(place.id, place.pickedBy));
  };

  const restore = (placeId: string) => {
    const timer = pending.current.get(placeId);
    if (timer === undefined) return;
    clearTimeout(timer);
    pending.current.delete(placeId);
    unhide(placeId);
    setRestored((current) => ({ id: placeId, seq: (current?.seq ?? 0) + 1 }));
  };

  const hiddenBy = (memberId: string) =>
    [...hidden.values()].filter((pickedBy) => pickedBy === memberId).length;

  const counts: Record<string, number> = {
    [ALL_MEMBERS]: Math.max(0, data.totalCount - hidden.size),
  };
  for (const member of data.members) {
    counts[member.id] = Math.max(0, member.count - hiddenBy(member.id));
  }

  // 고른 멤버가 그사이 나가 서버가 「전체」를 주면 칩도 「전체」로 보임(8.1.2 로직 5)
  const shownId =
    selectedId !== ALL_MEMBERS && data.selectedMemberId === undefined ? ALL_MEMBERS : selectedId;

  return {
    members: data.members,
    counts,
    places: data.places.filter((place) => !hidden.has(place.id)),
    selectedId: shownId,
    restored,
    // 칩을 바꾸면 남은 되돌리기는 초점 대상이 아님(돌아왔을 때 칩에서 카드로 초점이 넘어가지 않게)
    select: (memberId: string) => {
      writeHistoryMember(memberId);
      startSwitch(() => {
        setSelectedId(memberId);
        setRestored(undefined);
      });
    },
    isSwitching,
    // 이어 불러오기(기능명세서 8.1.3 상세 5·예외): 실패해도 보이던 카드는 두고, 다시 스크롤해 끝이 보일 때 재시도
    hasMore: hasNextPage,
    // 받은 목록이 바뀔 때마다(이어 받기·다시 받기) 감지 요소를 새로 붙여, 끝이 아직 보이면 바로 다음 쪽을 받게 함
    listVersion: dataUpdatedAt,
    loadingMore: isFetchingNextPage,
    loadMore: () => {
      // 콕 빼기 뒤 처음부터 다시 받는 중에는 이어 받기로 그 요청을 취소하지 않음(끝나면 감지 요소가 새로 붙어 다시 시도)
      if (hasNextPage && !isFetching) void fetchNextPage();
    },
    remove,
    restore,
  };
}
