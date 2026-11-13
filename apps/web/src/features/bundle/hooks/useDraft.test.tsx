import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../api/bundles';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { type DraftState, useDraft } from './useDraft';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const { me, memberA, memberB } = MOCK_MEMBER_IDS;
const bunchId = String(MOCK_BUNCH_ID);
const SAVE_WAIT = { timeout: 5000 };

const newDraft = async () =>
  (
    await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)],
      createIdempotencyKey(),
    )
  ).id;

const renderDraft = (draftId: string | undefined) =>
  renderHook(() => useDraft(draftId), { wrapper: createQueryWrapper(createTestQueryClient()) });

const ready = (state: DraftState) => {
  if (state.kind !== 'ready') throw new Error(`state is ${state.kind}`);
  return state;
};

const serverBundle = (id: string) =>
  mockDb.get().bundles.find((bundle) => String(bundle.id) === id);

const renderReady = async () => {
  const id = await newDraft();
  const view = renderDraft(id);
  await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
  return { id, ...view };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDraft 상태', () => {
  it('처음에는 로딩이고 끝나면 번들·번치 멤버·내 정보를 합친 초안이 준비된다', async () => {
    const id = await newDraft();
    const { result } = renderDraft(id);
    expect(result.current.state.kind).toBe('loading');

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const { draft, viewer, bunchMembers, saveStatus } = ready(result.current.state);
    expect(draft).toMatchObject({ id, title: '', visibility: null, date: null });
    expect(draft.members.map((member) => member.id)).toEqual([String(me), String(memberA)]);
    expect(draft.members[0]).toMatchObject({ isCreator: true, bunchRole: 'member' });
    expect(draft.photos).toHaveLength(2);
    expect(draft.photos[0]).toMatchObject({ src: '/mock/photos/S4.jpg' });
    expect(bunchMembers).toHaveLength(5);
    expect(viewer).toEqual({ memberId: String(me), bunchRole: 'member' });
    expect(saveStatus).toBe('saved');
  });

  it('화면에서 위치를 바꾸면 그 뒤로는 화면 값이다', async () => {
    const { result } = await renderReady();
    act(() => {
      result.current.actions.addLocation({ id: 'x', name: '장소 X', address: '주소 X' });
    });

    expect(ready(result.current.state).draft.locations.map((l) => l.name)).toEqual(['장소 X']);
  });

  it('없는 번들·숫자가 아닌 id·번치 멤버가 아닌 경우는 없는 초안이다', async () => {
    const invalid = renderDraft('abc');
    expect(invalid.result.current.state.kind).toBe('missing');
    const none = renderDraft(undefined);
    expect(none.result.current.state.kind).toBe('missing');

    const gone = renderDraft('999');
    await waitFor(() => expect(gone.result.current.state.kind).toBe('missing'));
  });

  it('기본 번치가 없거나 내가 번치 멤버가 아니면 로딩에 머물지 않고 없는 초안이다', async () => {
    const id = await newDraft();
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.filter((membership) => membership.memberId !== me),
    }));
    const { result } = renderDraft(id);

    await waitFor(() => expect(result.current.state.kind).toBe('missing'));
  });

  it('이미 발행된 번들은 없는 초안으로 처리한다', async () => {
    const id = await newDraft();
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({ ...bundle, status: 'PUBLISHED' as const })),
    }));
    const { result } = renderDraft(id);

    await waitFor(() => expect(result.current.state.kind).toBe('missing'));
  });

  it('서버 응답에는 편집 중 표시가 없다(실시간 presence 연결 전)', async () => {
    const id = await newDraft();
    const { result } = renderDraft(id);

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(ready(result.current.state).draft.editing).toEqual({});
  });
});

describe('useDraft 저장', () => {
  it('제목을 쓰면 바로 화면에 보이고 입력이 멈춘 뒤 서버에 저장한다', async () => {
    const { id, result } = await renderReady();

    act(() => result.current.actions.setTitle('설악산 단풍'));

    expect(ready(result.current.state).draft.title).toBe('설악산 단풍');
    expect(ready(result.current.state).saveStatus).toBe('saving');
    await waitFor(() => expect(serverBundle(id)?.title).toBe('설악산 단풍'), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);
  });

  it('공개 범위는 고르는 즉시 저장하고 내 코멘트도 저장한다', async () => {
    const { id, result } = await renderReady();

    act(() => {
      result.current.actions.setVisibility('public');
      result.current.actions.setComment(String(me), '함께한 하루');
    });

    await waitFor(() => expect(serverBundle(id)?.visibility).toBe('PUBLIC'), SAVE_WAIT);
    await waitFor(
      () => expect(serverBundle(id)?.comments[0]).toMatchObject({ content: '함께한 하루' }),
      SAVE_WAIT,
    );
  });

  it('남의 코멘트는 저장하지 않는다', async () => {
    const { id, result } = await renderReady();

    act(() => result.current.actions.setComment(String(memberA), '대신 쓴 코멘트'));

    expect(serverBundle(id)?.comments).toEqual([]);
    expect(ready(result.current.state).draft.comments).toEqual([]);
  });

  it('날짜를 저장한다', async () => {
    const { id, result } = await renderReady();

    act(() => result.current.actions.setDate('2026-10-18'));

    await waitFor(() => expect(serverBundle(id)?.date).toBe('2026-10-18'), SAVE_WAIT);
  });

  it('서버 버전이 앞서 있어 충돌하면 최신 상세를 받은 뒤 입력을 이어서 저장한다', async () => {
    const { id, result } = await renderReady();
    // 다른 멤버가 먼저 제목을 바꿔 서버 버전이 올라간 상황
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        title: '다른 멤버의 제목',
        titleVersion: 1,
        revision: bundle.revision + 1,
      })),
    }));

    act(() => result.current.actions.setTitle('내 제목'));

    await waitFor(
      () => expect(serverBundle(id)).toMatchObject({ title: '내 제목', titleVersion: 2 }),
      {
        timeout: 8000,
      },
    );
    // 내 입력은 충돌 중에도 화면에서 사라지지 않음
    expect(ready(result.current.state).draft.title).toBe('내 제목');
  });

  it('권한·상태 오류는 다시 시도하지 않고 한 번만 안내하며 입력은 그대로 둔다', async () => {
    const { result } = await renderReady();
    let calls = 0;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => {
        calls += 1;
        return fail(403, 'AUTH_002');
      }),
    );

    act(() => result.current.actions.setVisibility('public'));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.saveFailed), SAVE_WAIT);
    // 재시도 간격(3초)보다 오래 기다려도 요청은 한 번뿐
    await act(() => new Promise((resolve) => setTimeout(resolve, 3500)));
    expect(calls).toBe(1);
    expect(ready(result.current.state).draft.visibility).toBe('public');
    // 저장을 포기한 상태는 「저장 중」에 고정되지 않고 「저장 실패」로 보임
    expect(ready(result.current.state).saveStatus).toBe('failed');
    expect(
      toast.mock.calls.filter(([message]) => message === BUNDLE_MESSAGES.saveFailed),
    ).toHaveLength(1);
  }, 15_000);

  it('서버가 앞뒤 공백을 지워 저장해도 입력란에는 친 원문이 남는다(입력 중 띄어쓰기 보존)', async () => {
    const { id, result } = await renderReady();

    act(() => result.current.actions.setTitle('여름 '));

    await waitFor(() => expect(serverBundle(id)?.title).toBe('여름'), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);
    expect(ready(result.current.state).draft.title).toBe('여름 ');

    // 이어서 쓰면 띄어쓰기를 유지한 채 이어지는 입력
    act(() => result.current.actions.setTitle('여름 바다'));
    expect(ready(result.current.state).draft.title).toBe('여름 바다');
  });

  it('다른 곳에서 제목이 바뀌면 입력 원문 대신 서버 값을 보인다', async () => {
    const { id, result } = await renderReady();
    act(() => result.current.actions.setTitle('여름 '));
    await waitFor(() => expect(serverBundle(id)?.title).toBe('여름'), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);

    // 다른 멤버가 제목을 바꾼 상황: 상세를 다시 받으면 서버 값이 보임
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        title: '다른 멤버의 제목',
        titleVersion: bundle.titleVersion + 1,
        revision: bundle.revision + 1,
      })),
    }));
    await act(async () => {
      await result.current.actions.publish();
    });

    await waitFor(() => expect(ready(result.current.state).draft.title).toBe('다른 멤버의 제목'));
  });

  it('서버 오류(5xx)는 일시 오류로 보고 다시 시도해 저장한다', async () => {
    const { id, result } = await renderReady();
    let calls = 0;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => {
        calls += 1;
        return calls === 1 ? fail(500, 'COMMON_500') : undefined;
      }),
    );

    act(() => result.current.actions.setVisibility('members'));

    await waitFor(() => expect(serverBundle(id)?.visibility).toBe('PRIVATE'), {
      timeout: 9000,
    });
    expect(calls).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it('이미 발행됨·본문 불일치(BUNDLE_002)는 충돌과 같은 안내로 알린다', async () => {
    const { result } = await renderReady();
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () => fail(409, 'BUNDLE_002')),
    );

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('failed');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.publishConflict);
  });

  it('저장이 진행 중일 때 발행을 눌러도 저장 실패로 처리하지 않고 끝나기를 기다린다', async () => {
    const { result } = await renderReady();
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', async () => {
        await delay(300);
        return undefined;
      }),
    );

    act(() => result.current.actions.setVisibility('members'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    // 저장은 성공했고 발행 조건(제목·코멘트 등)만 모자라 blocked
    expect(outcome).toBe('blocked');
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.saveFailed);
  });

  it('입력 직후 화면을 떠나도 남은 입력을 한 번 저장한다', async () => {
    const { id, result, unmount } = await renderReady();

    act(() => result.current.actions.setTitle('떠나기 직전 제목'));
    unmount();

    await waitFor(() => expect(serverBundle(id)?.title).toBe('떠나기 직전 제목'), SAVE_WAIT);
  });
});

describe('useDraft 참여 멤버·위치·사진', () => {
  it('참여 멤버를 더하고 내보내면 서버 참여자와 코멘트가 바뀐다', async () => {
    const { id, result } = await renderReady();

    act(() => result.current.actions.addMember(String(memberB)));
    await waitFor(() =>
      expect(ready(result.current.state).draft.members.map((m) => m.id)).toContain(String(memberB)),
    );

    act(() => result.current.actions.removeMember(String(memberB)));
    await waitFor(() =>
      expect(ready(result.current.state).draft.members.map((m) => m.id)).not.toContain(
        String(memberB),
      ),
    );
    expect(serverBundle(id)?.participants.map((p) => p.memberId)).toEqual([me, memberA]);
  });

  it('이미 참여 중이거나 번치 멤버가 아니면 요청하지 않는다', async () => {
    const { id, result } = await renderReady();
    const before = serverBundle(id)?.revision;

    act(() => {
      result.current.actions.addMember(String(memberA));
      result.current.actions.addMember('999');
    });

    expect(serverBundle(id)?.revision).toBe(before);
  });

  it('위치는 서버로 보내지 않고 화면에서만 더하고 뺀다(최대 개수까지)', async () => {
    const { id, result } = await renderReady();
    const before = serverBundle(id)?.revision;

    act(() => {
      result.current.actions.addLocation({ id: 'p1', name: '여의도한강공원', address: '주소' });
    });
    expect(ready(result.current.state).draft.locations).toEqual([
      { id: 'p1', name: '여의도한강공원' },
    ]);
    act(() => result.current.actions.removeLocation('p1'));

    expect(ready(result.current.state).draft.locations).toEqual([]);
    expect(serverBundle(id)?.revision).toBe(before);
    await expect(result.current.actions.searchPlaces('여의도')).resolves.not.toHaveLength(0);
  });

  it('사진을 빼면 서버 구성이 바뀌고 화면도 서버 값을 보인다', async () => {
    const { id, result } = await renderReady();
    const photoId = ready(result.current.state).draft.photos[0]!.id;

    act(() => result.current.actions.removePhoto(photoId));
    // 보내는 동안에도 화면은 바로 줄어 있음
    expect(ready(result.current.state).draft.photos).toHaveLength(1);

    await waitFor(() => expect(serverBundle(id)?.photos).toHaveLength(1), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);
    expect(ready(result.current.state).draft.photos.map((photo) => photo.sourcePhotoId)).toEqual([
      String(MOCK_PHOTO_IDS.S5),
    ]);
  });

  it('사진 순서를 옮기면 서버 순서가 바뀐다', async () => {
    const { id, result } = await renderReady();
    const photoId = ready(result.current.state).draft.photos[0]!.id;

    act(() => result.current.actions.movePhoto(photoId, 1));

    await waitFor(
      () =>
        expect(serverBundle(id)?.photos.map((p) => p.photoId)).toEqual([
          MOCK_PHOTO_IDS.S5,
          MOCK_PHOTO_IDS.S4,
        ]),
      SAVE_WAIT,
    );
    await waitFor(
      () =>
        expect(
          ready(result.current.state).draft.photos.map((photo) => photo.sourcePhotoId),
        ).toEqual([String(MOCK_PHOTO_IDS.S5), String(MOCK_PHOTO_IDS.S4)]),
      SAVE_WAIT,
    );
  });

  it('사진을 추가하면 서버가 맨 뒤에 붙이고, 고른 순서가 다르면 이동으로 맞춘다', async () => {
    const { id, result } = await renderReady();
    const current = ready(result.current.state).draft.photos;
    const added = {
      id: 'temp-added',
      src: '/mock/photos/S1.jpg',
      alt: '추가한 사진',
      takenAt: null,
      uploaderId: String(me),
      sourcePhotoId: String(MOCK_PHOTO_IDS.S1),
    };

    // 새 사진을 맨 앞에 둔 선택 결과
    act(() => result.current.actions.replacePhotos([added, ...current]));

    await waitFor(
      () =>
        expect(serverBundle(id)?.photos.map((p) => p.photoId)).toEqual([
          MOCK_PHOTO_IDS.S1,
          MOCK_PHOTO_IDS.S4,
          MOCK_PHOTO_IDS.S5,
        ]),
      SAVE_WAIT,
    );
  });
});

describe('useDraft 발행', () => {
  const fill = async (result: ReturnType<typeof renderDraft>['result'], id: string) => {
    act(() => {
      result.current.actions.setTitle('설악산');
      result.current.actions.setVisibility('members');
      result.current.actions.setComment(String(me), '내 코멘트');
    });
    await waitFor(
      () => expect(serverBundle(id)?.comments[0]?.content).toBe('내 코멘트'),
      SAVE_WAIT,
    );
    await waitFor(() => expect(serverBundle(id)?.title).toBe('설악산'), SAVE_WAIT);
    // 멤버 A의 코멘트는 가짜 서버 데이터에 직접 넣음(내 계정으로는 남의 코멘트를 저장할 수 없음)
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        comments: [
          ...bundle.comments,
          {
            memberId: memberA,
            content: '멤버 코멘트',
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        revision: bundle.revision + 1,
      })),
    }));
  };

  it('사진 변경이 실패하면 화면과 다른 서버 구성을 발행하지 않고 안내한다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', () => fail(500, 'COMMON_500')),
    );
    const photoId = ready(result.current.state).draft.photos[0]!.id;
    act(() => result.current.actions.removePhoto(photoId));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('blocked');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
    expect(serverBundle(id)?.status).toBe('DRAFT');
    // 화면도 서버 구성으로 돌아와 있음
    expect(ready(result.current.state).draft.photos).toHaveLength(2);
  });

  it('사진 구성을 바꾼 직후 업로드해도 바뀐 구성이 발행된다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    const photoId = ready(result.current.state).draft.photos[0]!.id;
    act(() => result.current.actions.removePhoto(photoId));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('published');
    expect(serverBundle(id)?.status).toBe('PUBLISHED');
    expect(serverBundle(id)?.photos).toHaveLength(1);
  });

  it('조건이 모자란 발행은 안내하고 blocked를 돌려준다', async () => {
    const { result } = await renderReady();

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('blocked');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete);
  });

  it('저장하지 못한 입력까지 저장한 뒤 발행하고 발행되면 서버 상태가 발행본이 된다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    // 발행 직전에 쓴 입력도 먼저 저장됨
    act(() => result.current.actions.setTitle('설악산 단풍 여행'));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('published');
    expect(serverBundle(id)).toMatchObject({ status: 'PUBLISHED', title: '설악산 단풍 여행' });
    // 발행한 뒤에는 「삭제된 번들」 안내 없이 화면 이동을 기다림
    expect(result.current.state.kind).toBe('loading');
  });
});
