import { useCallback, useEffect, useRef, useState } from 'react';
import type { DraftActions, DraftState } from '../hooks/useDraft';
import type { Draft, PlaceResult, SaveStatus } from '../lib/types';
import { MAX_LOCATIONS } from '../constants/messages';
import {
  bunchMembersFixture,
  draftFixture,
  draftViewerFixture,
  placeFixture,
} from '../fixtures/draft.fixture';
import { moveLocation } from '../lib/locations';
import { movePhoto, removePhoto } from '../lib/photos';

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

/**
 * 초안 화면 테스트용 대역(샘플 초안과 메모리 상태, 실제 저장은 하지 않음). 서버 연동 `useDraft`는 가짜 서버로 따로 테스트
 * 초안 상태와 동작. 초안 조회·저장·장소 검색 API 연결 전에는 fixture와 메모리 상태이고, 연결하면 이 hook만 바꿈
 * 바꿀 때마다 「저장 중」이 되고 입력이 멈춘 뒤 「저장 완료」로 돌아옴(실제 저장은 하지 않음)
 */
export function useDraftFixture(draftId: string | undefined): {
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
    moveLocation: (locationId, toIndex) =>
      update((current) => ({
        ...current,
        locations: [...moveLocation(current.locations, locationId, toIndex)],
      })),
    setDate: (date) => update((current) => ({ ...current, date })),
    addMember: (memberId) =>
      update((current) => {
        const member = bunchMembersFixture.find((candidate) => candidate.id === memberId);
        return !member || current.members.some((joined) => joined.id === memberId)
          ? current
          : { ...current, members: [...current.members, member] };
      }),
    removeMember: (memberId) =>
      update((current) => ({
        ...current,
        members: current.members.filter((member) => member.id !== memberId),
        comments: current.comments.filter((comment) => comment.memberId !== memberId),
      })),
    removePhoto: (photoId) =>
      update((current) => ({ ...current, photos: removePhoto(current.photos, photoId) })),
    movePhoto: (photoId, toIndex) =>
      update((current) => ({ ...current, photos: movePhoto(current.photos, photoId, toIndex) })),
    replacePhotos: (photos) => update((current) => ({ ...current, photos })),
    searchPlaces,
    publish: () => Promise.resolve('published' as const),
  };

  return {
    state: exists
      ? {
          kind: 'ready',
          draft,
          viewer: draftViewerFixture,
          bunchMembers: bunchMembersFixture,
          saveStatus,
        }
      : { kind: 'missing', reason: 'deleted' },
    actions,
  };
}
