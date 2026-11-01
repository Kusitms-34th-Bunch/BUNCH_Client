'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Draft, DraftViewer, PlaceResult, SaveStatus } from '../lib/types';
import { MAX_LOCATIONS } from '../constants/messages';
import { draftFixture, draftViewerFixture, placeFixture } from '../fixtures/draft.fixture';

// 입력이 멈추고 이만큼 지나면 저장 완료로 봄(기능 spec 4.3.14의 「입력이 1초 멈출 때 저장」)
const SAVE_DELAY_MS = 1000;

/** 장소 검색 API 연결 전 목 검색(이름·주소에 키워드가 들어 있으면 결과). 렌더마다 바뀌지 않도록 hook 밖에 둠 */
const searchPlaces = (keyword: string): Promise<readonly PlaceResult[]> => {
  const query = keyword.trim();
  return Promise.resolve(
    query === ''
      ? []
      : placeFixture.filter((place) => place.name.includes(query) || place.address.includes(query)),
  );
};

export type DraftState =
  | { kind: 'missing' }
  | { kind: 'ready'; draft: Draft; viewer: DraftViewer; saveStatus: SaveStatus };

export type DraftActions = {
  setTitle: (_title: string) => void;
  setComment: (_memberId: string, _text: string) => void;
  setVisibility: (_visibility: Draft['visibility']) => void;
  addLocation: (_place: PlaceResult) => void;
  removeLocation: (_locationId: string) => void;
  setDate: (_date: string | null) => void;
  /** 참여 멤버를 내보냄(그 멤버의 코멘트도 함께 삭제) */
  removeMember: (_memberId: string) => void;
  searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>;
};

/**
 * 초안 상태와 동작. 초안 조회·저장·장소 검색 API 연결 전에는 fixture와 메모리 상태이고, 연결하면 이 hook만 바꿈
 * 바꿀 때마다 「저장 중」이 되고 입력이 멈춘 뒤 「저장 완료」로 돌아옴(실제 저장은 하지 않음)
 */
export function useDraft(draftId: string | undefined): {
  state: DraftState;
  actions: DraftActions;
} {
  const exists = draftId !== undefined && draftId === draftFixture.id;
  const [draft, setDraft] = useState<Draft>(draftFixture);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const update = useCallback((change: (_current: Draft) => Draft) => {
    setDraft(change);
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus('saved'), SAVE_DELAY_MS);
  }, []);

  const actions: DraftActions = {
    setTitle: (title) => update((current) => ({ ...current, title })),
    setComment: (memberId, text) =>
      update((current) => ({
        ...current,
        comments: current.comments.some((comment) => comment.memberId === memberId)
          ? current.comments.map((comment) =>
              comment.memberId === memberId ? { ...comment, text } : comment,
            )
          : [...current.comments, { memberId, text }],
      })),
    setVisibility: (visibility) => update((current) => ({ ...current, visibility })),
    addLocation: (place) =>
      update((current) =>
        current.locations.length >= MAX_LOCATIONS
          ? current
          : { ...current, locations: [...current.locations, { id: place.id, name: place.name }] },
      ),
    removeLocation: (locationId) =>
      update((current) => ({
        ...current,
        locations: current.locations.filter((location) => location.id !== locationId),
      })),
    setDate: (date) => update((current) => ({ ...current, date })),
    removeMember: (memberId) =>
      update((current) => ({
        ...current,
        members: current.members.filter((member) => member.id !== memberId),
        comments: current.comments.filter((comment) => comment.memberId !== memberId),
      })),
    searchPlaces,
  };

  return {
    state: exists
      ? { kind: 'ready', draft, viewer: draftViewerFixture, saveStatus }
      : { kind: 'missing' },
    actions,
  };
}
