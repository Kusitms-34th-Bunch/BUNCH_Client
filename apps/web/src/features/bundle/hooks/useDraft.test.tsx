import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { changeBundle, snapshotOf } from '@/mocks/handlers/bundles';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { PlaceResult } from '../lib/types';
import type { BundleDetail } from '../model/bundle';
import { createBundle } from '../api/bundles';
import { applyBundleLocationIntent } from '../api/locations';
import { changeBundlePhotos } from '../api/photos';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { editTitle, ensureTitleCrdt, loadTitleDoc, saveTitleDoc } from '../lib/titleCrdt';
import { bundleKeys } from '../queries/keys';
import { type DraftState, useDraft } from './useDraft';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const { me, memberA, memberB } = MOCK_MEMBER_IDS;
const place = (key: string, name: string, address: string): PlaceResult => ({
  id: `test:${key}`,
  provider: 'test',
  externalId: key,
  name,
  address,
});
const bunchId = String(MOCK_BUNCH_ID);
const SAVE_WAIT = { timeout: 5000 };

const newDraft = async () =>
  (
    await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)],
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
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

  it('위치를 더하면 화면에 먼저 보이고 서버에 저장된 뒤 서버 행 id로 바뀐다', async () => {
    const { id, result } = await renderReady();
    act(() => {
      result.current.actions.addLocation(place('x', '장소 X', '주소 X'));
    });

    // 응답 전에도 화면에 보임(아직 서버 id가 없는 줄)
    expect(ready(result.current.state).draft.locations[0]?.id).toMatch(/^pending:/);
    expect(ready(result.current.state).draft.locations.map((l) => l.name)).toEqual(['장소 X']);
    await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);
    await waitFor(
      () =>
        expect(ready(result.current.state).draft.locations).toEqual([
          {
            id: expect.stringMatching(/^[0-9]+$/) as string,
            provider: 'test',
            externalId: 'x',
            name: '장소 X',
            address: '주소 X',
          },
        ]),
      SAVE_WAIT,
    );
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

  it('실시간 연결 전에는 작업 중·입장 표시가 비어 있다', async () => {
    const id = await newDraft();
    const { result } = renderDraft(id);

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const { draft } = ready(result.current.state);
    expect(draft.viewingMemberIds).toEqual([]);
    expect(draft.editing.titleMemberIds ?? []).toEqual([]);
    expect(draft.editing.photoMemberIds ?? []).toEqual([]);
  });
});

describe('useDraft 번치 멤버 다시 받기', () => {
  it('받아 둔 번치 멤버가 있으면 다시 받기에 실패해도 오류 화면으로 바꾸지 않는다', async () => {
    const id = await newDraft();
    const client = createTestQueryClient();
    const view = renderHook(() => useDraft(id), { wrapper: createQueryWrapper(client) });
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    server.use(http.get('/api/bunches/:bunchId/members', () => fail(500, 'COMMON_500')));

    // 참여 멤버 관리에 들어올 때의 다시 받기가 실패한 경우
    await act(() =>
      client.refetchQueries({ queryKey: sharedKeys.bunchMembers(bunchId) }).catch(() => {}),
    );

    expect(client.getQueryState(sharedKeys.bunchMembers(bunchId))?.status).toBe('error');
    expect(view.result.current.state.kind).toBe('ready');
  });
});

describe('useDraft 참여 제외 안내', () => {
  const renderWithClient = async () => {
    const id = await newDraft();
    const client = createTestQueryClient();
    const view = renderHook(() => useDraft(id), { wrapper: createQueryWrapper(client) });
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    const removeMe = () =>
      act(() => {
        client.setQueryData<BundleDetail>(bundleKeys.detail(bunchId, id), (old) =>
          old
            ? {
                ...old,
                participantIds: old.participantIds.filter((memberId) => memberId !== String(me)),
              }
            : old,
        );
      });
    return { ...view, removeMe };
  };

  it('편집 중 참여 멤버에서 빠지면 보기 전용 안내를 한 번 띄운다', async () => {
    const { removeMe } = await renderWithClient();

    removeMe();

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.removedFromDraft));
    expect(
      toast.mock.calls.filter(([message]) => message === BUNDLE_MESSAGES.removedFromDraft),
    ).toHaveLength(1);
  });

  it('처음 불러온 뒤 참여 멤버가 그대로이면 띄우지 않는다', async () => {
    await renderWithClient();

    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.removedFromDraft);
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

  it('입력란을 벗어나면 1초를 기다리지 않고 바로 저장한다', async () => {
    const { id, result } = await renderReady();

    act(() => {
      result.current.actions.setTitle('벗어나며 저장');
      result.current.actions.setComment(String(me), '코멘트도 함께');
    });
    expect(serverBundle(id)?.title).toBe('');
    act(() => result.current.actions.saveNow());

    // 입력이 멈춘 뒤 저장 대기(1초)보다 훨씬 짧게 서버에 반영됨
    await waitFor(() => expect(serverBundle(id)?.title).toBe('벗어나며 저장'), { timeout: 700 });
    await waitFor(() => expect(serverBundle(id)?.comments[0]?.content).toBe('코멘트도 함께'), {
      timeout: 700,
    });
  });

  it('저장할 입력이 없으면 입력란을 벗어나도 요청을 보내지 않는다', async () => {
    const { id, result } = await renderReady();
    const before = serverBundle(id)?.revision;

    act(() => result.current.actions.saveNow());
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

    expect(serverBundle(id)?.revision).toBe(before);
  });

  it('공개 범위는 서버에 저장하지 않고 화면에만 두며 내 코멘트는 저장한다', async () => {
    const { id, result } = await renderReady();

    act(() => {
      result.current.actions.setVisibility('public');
      result.current.actions.setComment(String(me), '함께한 하루');
    });

    await waitFor(
      () => expect(serverBundle(id)?.comments[0]).toMatchObject({ content: '함께한 하루' }),
      SAVE_WAIT,
    );
    // 최종 선택은 업로드(발행) 요청으로만 보냄(v5 명세)
    expect(ready(result.current.state).draft.visibility).toBe('public');
    expect(serverBundle(id)?.visibility).toBeNull();
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
      http.put('/api/bunches/:bunchId/bundles/:id/date', () => {
        calls += 1;
        return fail(403, 'AUTH_002');
      }),
    );

    act(() => result.current.actions.setDate('2026-10-18'));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.saveFailed), SAVE_WAIT);
    // 재시도 간격(3초)보다 오래 기다려도 요청은 한 번뿐
    await act(() => new Promise((resolve) => setTimeout(resolve, 3500)));
    expect(calls).toBe(1);
    expect(ready(result.current.state).draft.date).toBe('2026-10-18');
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

  it('다른 멤버가 제목을 고치면 상세를 다시 받을 때 내 문서에 병합해 보인다', async () => {
    const { id, result } = await renderReady();
    act(() => result.current.actions.setTitle('여름 '));
    await waitFor(() => expect(serverBundle(id)?.title).toBe('여름'), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);

    // 다른 멤버가 같은 문서에서 제목 뒤에 글자를 더한 상황(서버 문서가 바뀜): 상세를 다시 받으면 병합돼 보임
    const state = serverBundle(id)?.titleCrdtState ?? '';
    await ensureTitleCrdt();
    const theirs = saveTitleDoc(editTitle(loadTitleDoc(state), '여름 바다'));
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        title: '여름 바다',
        titleVersion: bundle.titleVersion + 1,
        titleCrdtState: theirs,
        revision: bundle.revision + 1,
      })),
    }));
    // 공개 범위를 골라야 발행 요청이 나가고, 요청이 거절되면 상세를 다시 받음
    act(() => result.current.actions.setVisibility('members'));
    await act(async () => {
      await result.current.actions.publish();
    });

    await waitFor(() => expect(ready(result.current.state).draft.title).toBe('여름 바다'));
  });

  it('내가 입력한 제목과 다른 멤버의 변경이 저장되기 전에 겹쳐도 둘 다 남는다', async () => {
    const { id, result } = await renderReady();
    act(() => result.current.actions.setTitle('부산'));
    await waitFor(() => expect(serverBundle(id)?.title).toBe('부산'), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);

    // 다른 멤버가 앞에 글자를 더해 서버에 저장하고, 나는 그 사실을 모른 채 뒤에 글자를 입력
    await ensureTitleCrdt();
    const base = serverBundle(id)?.titleCrdtState ?? '';
    const theirs = saveTitleDoc(editTitle(loadTitleDoc(base), '가을 부산'));
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        title: '가을 부산',
        titleVersion: bundle.titleVersion + 1,
        titleCrdtState: theirs,
        revision: bundle.revision + 1,
      })),
    }));
    act(() => result.current.actions.setTitle('부산 여행'));

    await waitFor(() => expect(serverBundle(id)?.title).toBe('가을 부산 여행'), SAVE_WAIT);
    await waitFor(() => expect(ready(result.current.state).draft.title).toBe('가을 부산 여행'));
  });

  it('서버 오류(5xx)는 일시 오류로 보고 다시 시도해 저장한다', async () => {
    const { id, result } = await renderReady();
    let calls = 0;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/date', () => {
        calls += 1;
        return calls === 1 ? fail(500, 'COMMON_500') : undefined;
      }),
    );

    act(() => result.current.actions.setDate('2026-10-18'));

    await waitFor(() => expect(serverBundle(id)?.date).toBe('2026-10-18'), {
      timeout: 9000,
    });
    expect(calls).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it('이미 발행됨·본문 불일치(BUNDLE_002)는 충돌과 같은 안내로 알린다', async () => {
    const { result } = await renderReady();
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () => fail(409, 'BUNDLE_002')),
    );

    act(() => result.current.actions.setVisibility('members'));
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('failed');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.publishConflict);
  });

  it('발행 때 다시 검사한 금칙어로 거부(COMMON_003)되면 내용을 확인하라고 알리고 blocked로 끝낸다', async () => {
    const { result } = await renderReady();
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () =>
        fail(400, 'COMMON_003', { fields: ['title'] }),
      ),
    );

    act(() => result.current.actions.setVisibility('members'));
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('blocked');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.publishProhibited);
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.publishFailed);
  });

  it('저장이 진행 중일 때 발행을 눌러도 저장 실패로 처리하지 않고 끝나기를 기다린다', async () => {
    const { result } = await renderReady();
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/date', async () => {
        await delay(300);
        return undefined;
      }),
    );

    act(() => {
      result.current.actions.setVisibility('members');
      result.current.actions.setDate('2026-10-18');
    });
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

    act(() => void result.current.actions.addMember(String(memberB)));
    await waitFor(() =>
      expect(ready(result.current.state).draft.members.map((m) => m.id)).toContain(String(memberB)),
    );

    act(() => void result.current.actions.removeMember(String(memberB)));
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

  it('위치를 더하고 바꾸고 옮기고 지우면 서버에 순서대로 저장된다', async () => {
    const { id, result } = await renderReady();
    const names = () => ready(result.current.state).draft.locations.map((l) => l.name);
    const saved = () => serverBundle(id)?.locations.map((l) => l.name);

    act(() => {
      result.current.actions.addLocation(place('a', '장소 A', '주소 A'));
      result.current.actions.addLocation(place('b', '장소 B', '주소 B'));
    });
    await waitFor(() => expect(saved()).toEqual(['장소 A', '장소 B']), SAVE_WAIT);
    // 행 수가 아니라 두 줄 모두 서버 id를 받았는지로 기다림(낙관적으로 얹은 줄은 임시 id)
    await waitFor(() => {
      const rows = ready(result.current.state).draft.locations;
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => !row.id.startsWith('pending:'))).toBe(true);
    }, SAVE_WAIT);

    const [first, second] = ready(result.current.state).draft.locations;
    act(() => result.current.actions.moveLocation(second!.id, 0));
    expect(names()).toEqual(['장소 B', '장소 A']);
    await waitFor(() => expect(saved()).toEqual(['장소 B', '장소 A']), SAVE_WAIT);

    act(() => result.current.actions.replaceLocation(first!.id, place('c', '장소 C', '주소 C')));
    expect(names()).toEqual(['장소 B', '장소 C']);
    await waitFor(() => expect(saved()).toEqual(['장소 B', '장소 C']), SAVE_WAIT);

    act(() => result.current.actions.removeLocation(second!.id));
    expect(names()).toEqual(['장소 C']);
    await waitFor(() => expect(saved()).toEqual(['장소 C']), SAVE_WAIT);
    await expect(result.current.actions.searchPlaces('여의도')).resolves.not.toHaveLength(0);
  });

  it('같은 장소를 다시 더하거나 3개를 넘기면 서버에 보내지 않고 명세 문구로 알린다', async () => {
    const { id, result } = await renderReady();
    act(() => {
      result.current.actions.addLocation(place('a', '장소 A', '주소 A'));
    });
    await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);

    act(() => {
      result.current.actions.addLocation(place('a', '장소 A', '주소 A'));
    });
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.locationDuplicate);

    for (const key of ['b', 'c']) {
      act(() => {
        result.current.actions.addLocation(place(key, `장소 ${key}`, '주소'));
      });
    }
    await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(3), SAVE_WAIT);
    act(() => {
      result.current.actions.addLocation(place('d', '장소 D', '주소 D'));
    });

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.locationMax);
    expect(serverBundle(id)?.locations).toHaveLength(3);
  });

  it('줄을 같은 장소로 바꾸면 아무 알림 없이 그대로 두고, 다른 줄에 있는 장소로 바꾸면 「이미 추가한 위치예요.」를 알린다', async () => {
    const { id, result } = await renderReady();
    for (const key of ['a', 'b']) {
      act(() => {
        result.current.actions.addLocation(place(key, `장소 ${key}`, '주소'));
      });
    }
    await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(2), SAVE_WAIT);
    const [first] = ready(result.current.state).draft.locations;
    toast.mockClear();

    act(() => result.current.actions.replaceLocation(first!.id, place('a', '장소 a', '주소')));
    expect(toast).not.toHaveBeenCalled();

    act(() => result.current.actions.replaceLocation(first!.id, place('b', '장소 b', '주소')));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.locationDuplicate);
    expect(serverBundle(id)?.locations.map((location) => location.externalId)).toEqual(['a', 'b']);
  });

  it('끌던 줄이 내가 막 추가한 줄이라 id가 바뀐 경우에는 지워졌다는 알림을 띄우지 않는다', async () => {
    const { result } = await renderReady();
    toast.mockClear();

    act(() => result.current.actions.moveLocation('pending:9', 0));

    expect(toast).not.toHaveBeenCalled();
  });

  describe('위치 요청의 저장 상태·발행·연결 끊김', () => {
    // 첫 위치 요청의 응답을 늦춰 요청이 오가는 동안을 만듦
    const slowFirstIntent = (ms: number) => {
      let first = true;
      server.use(
        http.post('/api/bunches/:bunchId/bundles/:id/locations/intents', async () => {
          if (first) {
            first = false;
            await delay(ms);
          }
          return undefined;
        }),
      );
    };

    it('위치 요청이 끝나기 전에는 「저장 중」으로 보이고 끝나면 「저장 완료」가 된다', async () => {
      const { id, result } = await renderReady();
      slowFirstIntent(150);

      act(() => result.current.actions.addLocation(place('a', '장소 A', '주소 A')));

      expect(ready(result.current.state).saveStatus).toBe('saving');
      await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);
      await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);
    });

    it('연결이 끊기면 아직 보내지 않은 위치 변경은 버리고 이미 보낸 것만 서버에 남는다', async () => {
      const { id, result } = await renderReady();
      slowFirstIntent(200);

      act(() => {
        result.current.actions.addLocation(place('a', '장소 A', '주소 A'));
        result.current.actions.addLocation(place('b', '장소 B', '주소 B'));
      });
      // 첫 요청이 서버로 나간 뒤(응답은 아직 오지 않음)에 연결이 끊김
      await act(async () => {
        await delay(50);
      });
      const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      try {
        act(() => {
          window.dispatchEvent(new Event('offline'));
        });
        // 이미 나간 첫 요청의 응답이 오기 전에는 낙관적 변경을 걷어도 「저장 중」으로 보임
        expect(ready(result.current.state).saveStatus).toBe('saving');
        // 첫 요청이 끝난 뒤에도 대기 중이던 둘째 변경은 보내지 않음
        await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);
        await delay(300);
        expect(serverBundle(id)?.locations.map((location) => location.name)).toEqual(['장소 A']);
      } finally {
        onLine.mockRestore();
        act(() => {
          window.dispatchEvent(new Event('online'));
        });
      }
    });

    it('끊김을 화면이 알아채기 전에 첫 응답이 끝나도 대기 중이던 둘째 변경은 보내기 직전에 막는다', async () => {
      const { id, result } = await renderReady();
      slowFirstIntent(200);

      act(() => {
        result.current.actions.addLocation(place('a', '장소 A', '주소 A'));
        result.current.actions.addLocation(place('b', '장소 B', '주소 B'));
      });
      await act(async () => {
        await delay(50);
      });
      // 'offline' 이벤트는 보내지 않아 화면(discard)은 아직 끊김을 모르는 상태에서 브라우저 연결만 끊김
      const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      try {
        await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);
        await delay(300);

        expect(serverBundle(id)?.locations.map((location) => location.name)).toEqual(['장소 A']);
        // 보내지 못한 둘째 변경의 낙관적 표시도 걷힘
        await waitFor(
          () =>
            expect(ready(result.current.state).draft.locations.map((row) => row.name)).toEqual([
              '장소 A',
            ]),
          SAVE_WAIT,
        );
      } finally {
        onLine.mockRestore();
      }
    });

    it('지운 줄의 행 id를 새 줄이 이어받지 않는다(늦은 옛 요청이 새 줄을 건드리지 않도록)', async () => {
      const { id, result } = await renderReady();

      act(() => result.current.actions.addLocation(place('a', '장소 A', '주소 A')));
      await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);
      const firstId = serverBundle(id)?.locations[0]?.id;
      await waitFor(
        () => expect(ready(result.current.state).draft.locations[0]?.id).toBe(String(firstId)),
        SAVE_WAIT,
      );
      act(() => result.current.actions.removeLocation(String(firstId)));
      await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(0), SAVE_WAIT);
      act(() => result.current.actions.addLocation(place('b', '장소 B', '주소 B')));
      await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);

      expect(serverBundle(id)?.locations[0]?.id).not.toBe(firstId);

      // 지운 줄을 향해 늦게 도착한 옛 REMOVE·REPLACE는 새 줄을 건드리지 않음
      const newId = serverBundle(id)?.locations[0]?.id;
      await applyBundleLocationIntent(bunchId, id, {
        intent: 'REMOVE',
        targetLocationId: String(firstId),
      });
      await applyBundleLocationIntent(bunchId, id, {
        intent: 'REPLACE',
        targetLocationId: String(firstId),
        place: place('c', '장소 C', '주소 C'),
      });
      const ids = serverBundle(id)?.locations.map((location) => location.id);
      expect(ids).toContain(newId);
      expect(serverBundle(id)?.locations.find((location) => location.id === newId)?.name).toBe(
        '장소 B',
      );
    });
  });

  it('다른 멤버가 먼저 같은 장소를 넣어 서버가 거절하면 내 변경을 걷고 「이미 추가한 위치예요.」를 알린다', async () => {
    const { id, result } = await renderReady();
    // 화면은 모르는 사이 서버에 같은 장소가 들어감
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        String(bundle.id) === id
          ? {
              ...bundle,
              locations: [
                { id: 77, provider: 'test', externalId: 'a', name: '장소 A', address: '주소 A' },
              ],
              locationsVersion: bundle.locationsVersion + 1,
            }
          : bundle,
      ),
    }));

    act(() => {
      result.current.actions.addLocation(place('a', '장소 A', '주소 A'));
    });

    await waitFor(
      () => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.locationDuplicate),
      SAVE_WAIT,
    );
    expect(serverBundle(id)?.locations).toHaveLength(1);
    // 서버 목록의 줄 하나만 보임(내가 얹은 줄은 걷힘)
    await waitFor(
      () => expect(ready(result.current.state).draft.locations.map((l) => l.id)).toEqual(['77']),
      SAVE_WAIT,
    );
  });

  it('사진을 빼면 서버 구성이 바뀌고 화면도 서버 값을 보인다', async () => {
    const { id, result } = await renderReady();
    const photoId = ready(result.current.state).draft.photos[0]!.id;

    act(() => void result.current.actions.removePhoto(photoId));
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
    act(() => void result.current.actions.replacePhotos([added, ...current]));

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

  it('갤러리 부분 추가에서 담기지 않은 사진을 빼도 뒤이은 사진 빼기는 서버에 보낸다', async () => {
    const sample = mockDb.get().photos.find((photo) => photo.bunchId === MOCK_BUNCH_ID)!;
    const seeded = Object.values(MOCK_PHOTO_IDS);
    // 18장 초안 + 다른 멤버가 넣을 1장 + 내가 갤러리에서 가져올 A·B
    const extra = Array.from({ length: 18 - seeded.length + 3 }, (_, index) => 93001 + index);
    mockDb.update((current) => ({
      ...current,
      photos: [...current.photos, ...extra.map((photoId) => ({ ...sample, photoId }))],
    }));
    const inBundle = [...seeded, ...extra.slice(0, 18 - seeded.length)];
    const [otherMember, a, b] = extra.slice(18 - seeded.length) as [number, number, number];
    const id = (
      await createBundle(bunchId, inBundle.map(String), createIdempotencyKey(), [String(memberA)])
    ).id;
    const { result } = renderDraft(id);
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const current = ready(result.current.state).draft.photos;
    // 내 화면은 아직 18장인데 서버에서는 다른 멤버가 한 장을 먼저 넣어 19장
    await changeBundlePhotos({
      bunchId,
      bundleId: id,
      addPhotoIds: [String(otherMember)],
      removeBundlePhotoIds: [],
      mode: 'DRAFT',
      idempotencyKey: createIdempotencyKey(),
    });
    const galleryPhoto = (photoId: number) => ({
      id: `temp-${photoId}`,
      src: '/mock/photos/S1.jpg',
      alt: '갤러리 사진',
      takenAt: null,
      uploaderId: String(me),
      sourcePhotoId: String(photoId),
    });
    const removedExisting = current[0]!;

    act(() => {
      void result.current.actions.replacePhotos([...current, galleryPhoto(a), galleryPhoto(b)], {
        partialAdd: true,
        requested: 2,
      });
      // 응답 전에 B(서버에서 거절될 사진)와 기존 사진 C를 뺌
      void result.current.actions.removePhoto(`temp-${b}`);
      void result.current.actions.removePhoto(removedExisting.id);
    });

    await waitFor(
      () =>
        expect(serverBundle(id)?.photos.map((photo) => photo.photoId)).not.toContain(
          Number(removedExisting.sourcePhotoId),
        ),
      SAVE_WAIT,
    );
    const onServer = serverBundle(id)!.photos.map((photo) => photo.photoId);
    expect(onServer).toContain(a);
    expect(onServer).not.toContain(b);
    expect(onServer).toHaveLength(19);
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
  });

  it('갤러리 가져오기(partialAdd)는 남은 자리까지만 담고 담긴 장수를 알린다(기능명세서 4.3.14)', async () => {
    // 사진함에 원본을 더 넣고 19장짜리 초안을 만듦(다른 멤버가 이미 자리를 채운 상황)
    const sample = mockDb.get().photos.find((photo) => photo.bunchId === MOCK_BUNCH_ID)!;
    const seeded = Object.values(MOCK_PHOTO_IDS);
    // 19장을 채우고 갤러리에서 2장을 더 가져올 만큼 원본을 더함
    const extra = Array.from({ length: 19 - seeded.length + 2 }, (_, index) => 92001 + index);
    mockDb.update((current) => ({
      ...current,
      photos: [...current.photos, ...extra.map((photoId) => ({ ...sample, photoId }))],
    }));
    const inBundle = [...seeded, ...extra.slice(0, 19 - seeded.length)];
    expect(inBundle).toHaveLength(19);
    const id = (
      await createBundle(bunchId, inBundle.map(String), createIdempotencyKey(), [String(memberA)])
    ).id;
    const { result } = renderDraft(id);
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const current = ready(result.current.state).draft.photos;
    const fromGallery = extra.slice(19 - seeded.length).map((photoId) => ({
      id: `temp-${photoId}`,
      src: '/mock/photos/S1.jpg',
      alt: '갤러리 사진',
      takenAt: null,
      uploaderId: String(me),
      sourcePhotoId: String(photoId),
    }));

    act(
      () =>
        void result.current.actions.replacePhotos([...current, ...fromGallery], {
          partialAdd: true,
          requested: fromGallery.length,
        }),
    );

    await waitFor(() => expect(serverBundle(id)?.photos).toHaveLength(20), SAVE_WAIT);
    await waitFor(
      () =>
        expect(toast).toHaveBeenCalledWith(
          '사진은 최대 20장까지 담을 수 있어요. 1장만 추가했어요.',
        ),
      SAVE_WAIT,
    );
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
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

  it('늦게 도착한 낡은 저장 응답이 먼저 끝난 사진 변경의 revision을 덮지 않고 최신 revision으로 발행한다', async () => {
    const { id, result } = await renderReady();
    const bundleId = Number(id);
    // 날짜 저장은 받는 즉시 서버에 반영하되 응답만 붙잡아 둠(그 뒤 사진 변경이 더 높은 revision으로 먼저 끝남)
    let releaseDate: () => void = () => undefined;
    const dateGate = new Promise<void>((resolve) => (releaseDate = resolve));
    let dateReceived = false;
    const published: number[] = [];
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/date', async ({ request }) => {
        const body = (await request.json()) as { value?: string };
        changeBundle(bundleId, (bundle) => ({
          ...bundle,
          date: body.value ?? null,
          dateVersion: bundle.dateVersion + 1,
        }));
        const stale = snapshotOf(bundleId);
        dateReceived = true;
        await dateGate;
        return stale;
      }),
      http.post('/api/bunches/:bunchId/bundles/:id/publish', async ({ request }) => {
        published.push(((await request.json()) as { expectedRevision: number }).expectedRevision);
        return undefined;
      }),
    );

    act(() => {
      result.current.actions.setVisibility('members');
      result.current.actions.setDate('2026-10-18');
    });
    await waitFor(() => expect(dateReceived).toBe(true), SAVE_WAIT);
    const photoId = ready(result.current.state).draft.photos[0]!.id;
    act(() => void result.current.actions.removePhoto(photoId));
    await waitFor(() => expect(serverBundle(id)?.photos).toHaveLength(1), SAVE_WAIT);
    const photoRevision = serverBundle(id)!.revision;
    await waitFor(
      () => expect(ready(result.current.state).draft.photos).toHaveLength(1),
      SAVE_WAIT,
    );

    releaseDate();
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'), SAVE_WAIT);
    await act(async () => void (await result.current.actions.publish()));

    expect(published).toEqual([photoRevision]);
  });

  it('발행은 보내는 중인 위치 요청이 끝난 뒤의 서버 구성으로 한다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    let firstIntent = true;
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/locations/intents', async () => {
        if (firstIntent) {
          firstIntent = false;
          await delay(200);
        }
        return undefined;
      }),
    );
    const locationsAtPublish: number[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () => {
        locationsAtPublish.push(serverBundle(id)?.locations.length ?? -1);
        return undefined;
      }),
    );

    act(() => result.current.actions.addLocation(place('a', '장소 A', '주소 A')));
    await act(async () => {
      expect(await result.current.actions.publish()).toBe('published');
    });

    expect(locationsAtPublish).toEqual([1]);
  });

  it('위치 요청 뒤 서버 revision이 바뀌었으면 재조회한 최신 revision으로 발행한다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    // 위치 요청이 서버 revision을 올리지만 응답은 상세 revision에 반영하지 않으므로, 발행 직전 재조회가 필요함
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/locations/intents', () => {
        mockDb.update((current) => ({
          ...current,
          bundles: current.bundles.map((bundle) =>
            String(bundle.id) === id ? { ...bundle, revision: bundle.revision + 5 } : bundle,
          ),
        }));
        return undefined;
      }),
    );
    const seen: { expected: number | undefined; server: number | undefined }[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', async ({ request }) => {
        const body = (await request.clone().json()) as { expectedRevision?: number };
        // 요청이 닿은 때의 서버 revision(발행이 끝나면 다시 올라가므로 이때 읽음)
        seen.push({ expected: body.expectedRevision, server: serverBundle(id)?.revision });
        return undefined;
      }),
    );

    act(() => result.current.actions.addLocation(place('a', '장소 A', '주소 A')));
    await act(async () => {
      expect(await result.current.actions.publish()).toBe('published');
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.expected).toBe(seen[0]?.server);
  });

  it('끌던 사진을 다른 멤버가 지웠으면 손을 뗄 때 알리고 그 사진을 없앤다(기능 spec 4.3.6)', async () => {
    const { id, result } = await renderReady();
    const [first, second] = ready(result.current.state).draft.photos;
    // 끄는 동안 다른 멤버가 첫 사진을 지움(화면은 이벤트를 미뤄 아직 모름)
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        String(bundle.id) === id
          ? { ...bundle, photos: bundle.photos.filter((photo) => photo.id !== Number(first!.id)) }
          : bundle,
      ),
    }));

    act(() => result.current.actions.movePhoto(first!.id, 1));

    await waitFor(
      () => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoRemovedByOther),
      SAVE_WAIT,
    );
    // 일반 사진 변경 실패 안내는 띄우지 않고 최신 상세로 그 사진이 사라지는 흐름
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
    await waitFor(
      () =>
        expect(ready(result.current.state).draft.photos.map((photo) => photo.id)).toEqual([
          second!.id,
        ]),
      SAVE_WAIT,
    );
  });

  it('위치 변경이 실패하면 서버에 반영되지 않은 구성으로 발행하지 않는다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    const published: number[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/locations/intents', () =>
        fail(500, 'COMMON_500'),
      ),
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () => {
        published.push(1);
        return undefined;
      }),
    );

    act(() => result.current.actions.addLocation(place('a', '장소 A', '주소 A')));
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('blocked');
    expect(published).toEqual([]);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.locationSaveFailed);
  });

  it('위치 변경 뒤 최신 상세를 받지 못하면 낡은 revision으로 발행하지 않는다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    const published: number[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () => {
        published.push(1);
        return undefined;
      }),
    );

    act(() => result.current.actions.addLocation(place('a', '장소 A', '주소 A')));
    await waitFor(() => expect(serverBundle(id)?.locations).toHaveLength(1), SAVE_WAIT);
    // 위치 요청이 끝난 뒤 발행 직전의 상세 재조회가 실패
    server.use(http.get('/api/bunches/:bunchId/bundles/:id', () => fail(500, 'COMMON_500')));
    act(() => result.current.actions.addLocation(place('b', '장소 B', '주소 B')));
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('failed');
    expect(published).toEqual([]);
  });

  it('고른 공개 범위를 발행 요청 본문에 싣고, 하나도 고르지 않았으면 요청 없이 막는다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    const bodies: unknown[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );

    await act(async () => {
      expect(await result.current.actions.publish()).toBe('published');
    });

    // fill()이 고른 「멤버 공개」가 서버 초안에는 저장되지 않고 발행 요청에만 실림
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ visibility: 'PRIVATE' });
  });

  it('네트워크 오류 뒤 같은 내용으로 다시 업로드하면 같은 요청 키로 보낸다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    const keys: (string | null)[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return keys.length === 1 ? HttpResponse.error() : undefined;
      }),
    );

    let first: string | undefined;
    let second: string | undefined;
    await act(async () => {
      first = await result.current.actions.publish();
    });
    await act(async () => {
      second = await result.current.actions.publish();
    });

    expect(first).toBe('failed');
    expect(second).toBe('published');
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('서버가 요청을 거절한 뒤에는 새 요청 키를 쓴다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    const keys: (string | null)[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return keys.length === 1 ? fail(409, 'BUNDLE_002') : undefined;
      }),
    );

    await act(async () => {
      await result.current.actions.publish();
    });
    await act(async () => {
      await result.current.actions.publish();
    });

    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('공개 범위를 고르지 않으면 발행 요청을 보내지 않고 막는다', async () => {
    const { result } = await renderReady();
    let requests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/publish', () => {
        requests += 1;
        return undefined;
      }),
    );

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.publish();
    });

    expect(outcome).toBe('blocked');
    expect(requests).toBe(0);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete);
  });

  it('사진 변경이 실패하면 화면과 다른 서버 구성을 발행하지 않고 안내한다', async () => {
    const { id, result } = await renderReady();
    await fill(result, id);
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', () => fail(500, 'COMMON_500')),
    );
    const photoId = ready(result.current.state).draft.photos[0]!.id;
    act(() => void result.current.actions.removePhoto(photoId));

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
    act(() => void result.current.actions.removePhoto(photoId));

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
