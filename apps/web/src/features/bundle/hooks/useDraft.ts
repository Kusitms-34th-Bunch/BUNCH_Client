'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Draft,
  DraftMember,
  DraftPhoto,
  DraftViewer,
  DraftVisibility,
  PlaceResult,
  SaveStatus,
} from '../lib/types';
import { MAX_LOCATIONS } from '../constants/messages';
import {
  bunchMembersFixture,
  draftFixture,
  draftViewerFixture,
  placeFixture,
} from '../fixtures/draft.fixture';
import { movePhoto, removePhoto, setPhotoCaption } from '../lib/photos';

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
  | {
      kind: 'ready';
      draft: Draft;
      viewer: DraftViewer;
      /** 번치 멤버 전체(참여하지 않은 멤버 포함) */
      bunchMembers: readonly DraftMember[];
      saveStatus: SaveStatus;
    };

export type DraftActions = {
  setTitle: (_title: string) => void;
  setComment: (_memberId: string, _text: string) => void;
  setVisibility: (_visibility: DraftVisibility) => void;
  addLocation: (_place: PlaceResult) => void;
  removeLocation: (_locationId: string) => void;
  setDate: (_date: string | null) => void;
  /** 번치 멤버를 참여 멤버 맨 아래에 더함(이미 참여 중이거나 번치 멤버가 아니면 무시) */
  addMember: (_memberId: string) => void;
  /** 참여 멤버를 내보냄(그 멤버의 코멘트도 함께 삭제) */
  removeMember: (_memberId: string) => void;
  /** 사진 캡션을 바꿈(최대 글자 수 보정은 호출하는 쪽이 함) */
  setPhotoCaption: (_photoId: string, _caption: string) => void;
  /** 사진을 번들에서 뺌(1장이면 무시, 캡션도 함께 사라짐) */
  removePhoto: (_photoId: string) => void;
  /** 사진을 다른 자리(0부터)로 옮김(캡션은 사진을 따라감) */
  movePhoto: (_photoId: string, _toIndex: number) => void;
  /** 사진 추가 화면에서 적용한 결과로 사진 목록 전체를 바꿈(빠진 사진의 캡션도 함께 사라짐) */
  replacePhotos: (_photos: readonly DraftPhoto[]) => void;
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
    setPhotoCaption: (photoId, caption) =>
      update((current) => ({
        ...current,
        photos: setPhotoCaption(current.photos, photoId, caption),
      })),
    removePhoto: (photoId) =>
      update((current) => ({ ...current, photos: removePhoto(current.photos, photoId) })),
    movePhoto: (photoId, toIndex) =>
      update((current) => ({ ...current, photos: movePhoto(current.photos, photoId, toIndex) })),
    replacePhotos: (photos) => update((current) => ({ ...current, photos })),
    searchPlaces,
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
      : { kind: 'missing' },
    actions,
  };
}
