import { useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BundleDetail } from '../model/bundle';
import { editTitle, ensureTitleCrdt, loadTitleDoc, saveTitleDoc } from '../lib/titleCrdt';
import {
  bundleQueryOptions,
  useCreateBundleMutation,
  useDeleteBundleMutation,
  useLeaveBundleMutation,
  usePublishBundleMutation,
  useApplyBundleEvent,
  useMergeTitleMutation,
  useSaveVisibilityMutation,
} from './bundles';
import { bundleKeys } from './keys';

const bunchId = String(MOCK_BUNCH_ID);
const photoIds = [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)];

const setup = () => {
  const client = createTestQueryClient();
  return { client, wrapper: createQueryWrapper(client) };
};

const createDraft = async (wrapper: ReturnType<typeof createQueryWrapper>) => {
  const { result } = renderHook(() => useCreateBundleMutation(bunchId), { wrapper });
  let id = '';
  await act(async () => {
    id = (
      await result.current.mutateAsync({
        photoIds,
        participantMemberIds: [String(MOCK_MEMBER_IDS.memberA)],
      })
    ).id;
  });
  return id;
};

describe('번들 query·mutation', () => {
  it('초안을 만들면 상세 캐시가 응답으로 채워진다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      id,
      status: 'DRAFT',
      revision: 1,
    });
  });

  it('상세 query는 번들을 아직 모르면 요청하지 않는다', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useQuery(bundleQueryOptions(bunchId, undefined)), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('제목 CRDT를 저장하면 병합 응답으로 상세 캐시의 제목 상태가 바로 최신이 된다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const before = client.getQueryData<BundleDetail>(bundleKeys.detail(bunchId, id));
    await ensureTitleCrdt();
    const edited = editTitle(loadTitleDoc(before?.titleCrdtState ?? ''), '설악산');
    const { result } = renderHook(() => useMergeTitleMutation(bunchId, id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(saveTitleDoc(edited));
    });

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      title: '설악산',
      titleVersion: 1,
      titleTooLong: false,
      // 병합 응답에는 번들 revision이 없어 그대로 둠
      revision: before?.revision,
    });
  });

  it('버전 충돌이면 최신 상세를 다시 받아 캐시가 서버 값으로 맞춰진다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    // 캐시를 읽고 있는 화면이 있어야 무효화가 재요청으로 이어짐
    renderHook(() => useQuery(bundleQueryOptions(bunchId, id)), { wrapper });
    const { result } = renderHook(() => useSaveVisibilityMutation(bunchId, id), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ value: 'PUBLIC', expectedVersion: 0, mode: 'DRAFT' });
    });

    // 오래된 버전으로 다시 저장 → BUNDLE_003
    await act(async () => {
      await result.current
        .mutateAsync({ value: 'PRIVATE', expectedVersion: 0, mode: 'DRAFT' })
        .catch(() => undefined);
    });

    await waitFor(() =>
      expect(client.getQueryState(bundleKeys.detail(bunchId, id))?.isInvalidated).toBe(false),
    );
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      visibility: 'PUBLIC',
      visibilityVersion: 1,
    });
  });

  it('발행에 성공하면 번치 홈 데이터(프로필·완성된 번들)를 무효화한다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    // 발행 조건을 채운 초안: 제목·공개 범위, 참여자 전원 코멘트
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        String(bundle.id) === id
          ? {
              ...bundle,
              title: '발행할 번들',
              titleVersion: 1,
              visibility: 'PRIVATE' as const,
              visibilityVersion: 1,
              comments: bundle.participants.map((p) => ({
                memberId: p.memberId,
                content: '코멘트',
                version: 1,
                createdAt: bundle.createdAt,
                updatedAt: bundle.createdAt,
              })),
              participants:
                bundle.participants.length >= 2
                  ? bundle.participants
                  : [...bundle.participants, { memberId: 2, joinedAt: bundle.createdAt }],
            }
          : bundle,
      ),
    }));
    // 번치 홈 데이터가 캐시에 있는 상태
    client.setQueryData(sharedKeys.bunchHome(bunchId), { stale: true });
    client.setQueryData(sharedKeys.publishedBundles(bunchId), { stale: true });
    const revision = mockDb.get().bundles.find((bundle) => String(bundle.id) === id)!.revision;
    const { result } = renderHook(() => usePublishBundleMutation(bunchId, id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ visibility: 'PRIVATE', expectedRevision: revision });
    });

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      status: 'PUBLISHED',
    });
    expect(client.getQueryState(sharedKeys.bunchHome(bunchId))?.isInvalidated).toBe(true);
    expect(client.getQueryState(sharedKeys.publishedBundles(bunchId))?.isInvalidated).toBe(true);
  });

  it('초안을 만들거나 삭제하거나 나가면 번치 홈 데이터(작성 중인 번들 포함)를 무효화한다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const homeKeys = [
      sharedKeys.bunchHome(bunchId),
      sharedKeys.publishedBundles(bunchId),
      sharedKeys.draftBundles(bunchId),
    ];
    const seedHome = () => homeKeys.forEach((key) => client.setQueryData(key, { stale: true }));
    const invalidated = () =>
      homeKeys.every((key) => client.getQueryState(key)?.isInvalidated === true);

    seedHome();
    const { result: deleting } = renderHook(() => useDeleteBundleMutation(bunchId), { wrapper });
    await act(async () => {
      await deleting.current.mutateAsync(id);
    });
    expect(invalidated()).toBe(true);
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toBeUndefined();

    const second = await createDraft(wrapper);
    seedHome();
    const { result: leaving } = renderHook(() => useLeaveBundleMutation(bunchId), { wrapper });
    await act(async () => {
      await leaving.current.mutateAsync(second);
    });
    expect(invalidated()).toBe(true);
    // 나가기는 작성 화면이 떠 있어 상세 캐시를 지우지 않음(지우면 그 화면이 「삭제된 번들」을 다시 받음)
    expect(client.getQueryData(bundleKeys.detail(bunchId, second))).toBeDefined();
  });

  it('삭제에 실패해도(이미 지워진 초안) 번치 홈 데이터를 서버 기준으로 다시 받는다', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(sharedKeys.draftBundles(bunchId), { stale: true });
    const { result } = renderHook(() => useDeleteBundleMutation(bunchId), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('999999')).rejects.toBeDefined();
    });

    expect(client.getQueryState(sharedKeys.draftBundles(bunchId))?.isInvalidated).toBe(true);
  });

  it('조건이 모자란 발행은 실패하고 캐시는 초안 그대로다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const { result } = renderHook(() => usePublishBundleMutation(bunchId, id), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ visibility: 'PUBLIC', expectedRevision: 1 })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'BUNDLE_005' }));
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({ status: 'DRAFT' });
  });

  describe('번들 topic 이벤트(TITLE)', () => {
    const titleEvent = (revision: number, title: string, titleVersion: number) => ({
      type: 'TITLE',
      revision,
      data: { title, titleVersion, titleCrdtState: 'state', titleTooLong: false },
    });
    const apply = async () => {
      const { client, wrapper } = setup();
      const id = await createDraft(wrapper);
      const { result } = renderHook(() => useApplyBundleEvent(bunchId, id), { wrapper });
      const detail = () => client.getQueryData<BundleDetail>(bundleKeys.detail(bunchId, id));
      return { client, id, detail, apply: result.current };
    };

    it('바로 다음 revision이면 제목 상태와 revision을 반영하고 같은 이벤트가 다시 와도 결과가 같다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const base = detail()?.revision ?? 0;

      applyEvent(titleEvent(base + 1, '새 제목', 5));
      applyEvent(titleEvent(base + 1, '새 제목', 5));

      expect(detail()).toMatchObject({
        title: '새 제목',
        titleVersion: 5,
        titleCrdtState: 'state',
        revision: base + 1,
      });
    });

    it('이미 반영된 revision이나 낡은 제목 버전은 무시한다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const base = detail()?.revision ?? 0;

      applyEvent(titleEvent(base, '무시', 9));

      expect(detail()?.title).not.toBe('무시');
    });

    it('revision이 건너뛰면 이벤트를 쓰지 않고 상세를 다시 받는다', async () => {
      const { client, id, detail, apply: applyEvent } = await apply();
      renderHook(() => useQuery(bundleQueryOptions(bunchId, id)), {
        wrapper: createQueryWrapper(client),
      });
      const base = detail()?.revision ?? 0;

      applyEvent(titleEvent(base + 3, '건너뜀', 9));

      expect(detail()?.title).not.toBe('건너뜀');
      await waitFor(() =>
        expect(client.getQueryState(bundleKeys.detail(bunchId, id))?.isInvalidated).toBe(true),
      );
    });

    it('길이 초과 제목은 발행 사유에 TITLE_TOO_LONG을 넣고 줄어들면 뺀다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const base = detail()?.revision ?? 0;

      applyEvent({
        ...titleEvent(base + 1, '가'.repeat(41), 6),
        data: {
          ...titleEvent(0, '', 0).data,
          title: '가'.repeat(41),
          titleVersion: 6,
          titleTooLong: true,
        },
      });
      expect(detail()?.publishBlockers).toContain('TITLE_TOO_LONG');

      applyEvent(titleEvent(base + 2, '짧게', 7));
      expect(detail()?.publishBlockers).not.toContain('TITLE_TOO_LONG');
    });

    it('알 수 없는 type과 봉투가 아닌 값은 건드리지 않는다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const before = detail();

      applyEvent({ type: 'ACTIVITY', revision: 99, data: {} });
      applyEvent({ type: 'PRESENCE', revision: null, data: {} });
      applyEvent('garbage');

      expect(detail()).toBe(before);
    });

    describe('그 밖의 내용 이벤트', () => {
      const next = (base: number | undefined, type: string, data: unknown, offset = 1) => ({
        type,
        revision: (base ?? 0) + offset,
        data,
      });
      const comment = (memberId: number, content: string, version: number) => ({
        id: memberId,
        memberId,
        content,
        version,
        createdAt: '2026-11-13T12:00:00Z',
        updatedAt: '2026-11-13T12:00:00Z',
        profileAvailable: true,
      });
      const invalidated = (client: ReturnType<typeof setup>['client'], id: string) =>
        client.getQueryState(bundleKeys.detail(bunchId, id))?.isInvalidated;

      it('DATE는 날짜·버전·추천 날짜를 반영하고 낡은 버전은 revision만 맞춘다', async () => {
        const { detail, apply: applyEvent } = await apply();
        const base = detail()?.revision;
        const version = (detail()?.dateVersion ?? 0) + 2;

        applyEvent(next(base, 'DATE', { value: '2026-11-12', version, dateChips: ['2026-11-11'] }));
        expect(detail()).toMatchObject({
          date: '2026-11-12',
          dateVersion: version,
          dateChips: ['2026-11-11'],
          revision: (base ?? 0) + 1,
        });

        applyEvent(next(base, 'DATE', { value: null, version: version - 1, dateChips: [] }, 2));
        expect(detail()).toMatchObject({ date: '2026-11-12', revision: (base ?? 0) + 2 });
      });

      it('VISIBILITY는 공개 범위와 버전을 반영한다', async () => {
        const { detail, apply: applyEvent } = await apply();
        const version = (detail()?.visibilityVersion ?? 0) + 1;

        applyEvent(next(detail()?.revision, 'VISIBILITY', { value: 'PRIVATE', version }));

        expect(detail()).toMatchObject({ visibility: 'PRIVATE', visibilityVersion: version });
      });

      it('LOCATION은 장소 목록을, PHOTOS는 사진 목록(position 순)과 추천 날짜를 통째로 바꾼다', async () => {
        const { detail, apply: applyEvent } = await apply();
        const base = detail()?.revision;

        applyEvent(
          next(base, 'LOCATION', {
            version: 1,
            locations: [
              {
                id: 3,
                provider: 'KAKAO',
                externalId: 'k1',
                name: '해운대',
                address: '부산',
                position: 0,
              },
            ],
          }),
        );
        expect(detail()?.locations).toEqual([{ id: 'KAKAO:k1', name: '해운대' }]);

        const photo = (id: number, position: number) => ({
          id,
          photoId: id + 100,
          imageAssetId: id,
          imageUrl: '/mock/photo.png',
          position,
          addedBy: 1,
          addedAt: '2026-11-13T12:00:00Z',
        });
        applyEvent(
          next(
            base,
            'PHOTOS',
            { photos: [photo(2, 1), photo(1, 0)], dateChips: ['2026-11-10'] },
            2,
          ),
        );
        expect(detail()?.photos.map((item) => item.id)).toEqual(['1', '2']);
        expect(detail()?.dateChips).toEqual(['2026-11-10']);
      });

      it('COMMENT는 그 멤버의 코멘트만 바꾸고 더 높은 버전은 낡은 이벤트로 덮지 않는다', async () => {
        const { detail, apply: applyEvent } = await apply();
        const base = detail()?.revision;

        applyEvent(next(base, 'COMMENT', comment(7, '처음', 1)));
        applyEvent(next(base, 'COMMENT', comment(7, '수정', 2), 2));
        applyEvent(next(base, 'COMMENT', comment(7, '낡음', 1), 3));

        expect(detail()?.comments.filter((item) => item.memberId === '7')).toEqual([
          { memberId: '7', content: '수정', version: 2 },
        ]);
        expect(detail()?.revision).toBe((base ?? 0) + 3);
      });

      it('PARTICIPANTS는 참여 멤버와 코멘트를 바꾸고 제외된 멤버의 코멘트를 지운다', async () => {
        const { detail, apply: applyEvent } = await apply();
        const participant = (memberId: number, joinedAt: string) => ({
          memberId,
          joinedAt,
          profileAvailable: true,
          creator: false,
        });

        applyEvent(
          next(detail()?.revision, 'PARTICIPANTS', {
            participants: [
              participant(9, '2026-11-13T12:00:02Z'),
              participant(8, '2026-11-13T12:00:01Z'),
            ],
            comments: [comment(8, '남음', 1), comment(9, '지워질 코멘트', 1)],
            removedCommentMemberIds: [9],
          }),
        );

        expect(detail()?.participantIds).toEqual(['8', '9']);
        expect(detail()?.comments).toEqual([{ memberId: '8', content: '남음', version: 1 }]);
      });

      it('DATE_CHIPS는 revision과 상관없이 추천 날짜만 바꾼다', async () => {
        const { detail, apply: applyEvent } = await apply();
        const before = detail()?.revision;

        applyEvent({ type: 'DATE_CHIPS', revision: null, data: { dateChips: ['2026-11-09'] } });
        applyEvent({ type: 'DATE_CHIPS', revision: before, data: ['2026-11-08'] });

        expect(detail()?.dateChips).toEqual(['2026-11-08']);
        expect(detail()?.revision).toBe(before);
      });

      it.each(['PERMISSIONS', 'DELETED'])(
        '%s는 최신 상세를 다시 받는다(revision이 없어도)',
        async (type) => {
          const { client, id, detail, apply: applyEvent } = await apply();
          const before = detail();

          applyEvent({ type, revision: null, data: null });

          expect(invalidated(client, id)).toBe(true);
          expect(detail()).toBe(before);
        },
      );

      it.each(['PUBLISHED', 'EDITED', 'CREATED'])(
        '%s는 요청한 사람마다 다른 권한이 있어 data를 쓰지 않고 상세를 다시 받는다',
        async (type) => {
          const { client, id, detail, apply: applyEvent } = await apply();
          const before = detail();

          applyEvent(next(before?.revision, type, { status: 'PUBLISHED' }));

          expect(invalidated(client, id)).toBe(true);
          expect(detail()).toBe(before);
        },
      );

      it('PUBLISHED·EDITED는 revision이 이미 반영된 값이어도 상세를 다시 받는다', async () => {
        const { client, id, detail, apply: applyEvent } = await apply();
        const before = detail();

        applyEvent(next(before?.revision, 'PUBLISHED', null, 0));

        expect(invalidated(client, id)).toBe(true);
      });

      it('먼저 보낸 재조회 응답이 더 새 revision으로 맞춘 캐시를 낡은 값으로 덮지 않는다', async () => {
        const { client, id, detail } = await apply();
        const { result } = renderHook(() => useQuery(bundleQueryOptions(bunchId, id)), {
          wrapper: createQueryWrapper(client),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const newer = {
          ...(detail() as BundleDetail),
          revision: (detail()?.revision ?? 0) + 5,
          title: '이벤트로 맞춤',
        };
        client.setQueryData(bundleKeys.detail(bunchId, id), newer);

        await act(async () => {
          await client.refetchQueries({ queryKey: bundleKeys.detail(bunchId, id) });
        });

        expect(detail()?.title).toBe('이벤트로 맞춤');
      });

      it('모양이 다른 data는 추측해 쓰지 않고 상세를 다시 받는다', async () => {
        const { client, id, detail, apply: applyEvent } = await apply();
        const before = detail();

        applyEvent(next(before?.revision, 'DATE', { value: 3 }));

        expect(invalidated(client, id)).toBe(true);
        expect(detail()).toBe(before);
      });
    });
  });
});
