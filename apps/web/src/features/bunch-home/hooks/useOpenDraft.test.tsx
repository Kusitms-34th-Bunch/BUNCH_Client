import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { type PrefetchDraft, useOpenDraft } from './useOpenDraft';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch: vi.fn() }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', () => ({ toast }));

beforeEach(() => vi.clearAllMocks());

const setup = (prefetchDraft: PrefetchDraft) => {
  const onGone = vi.fn();
  const { result } = renderHook(() => useOpenDraft({ prefetchDraft, onGone }));
  return { result, onGone };
};

describe('useOpenDraft', () => {
  it('카드에 닿을 때 시작한 확인을 누를 때 이어 써서 한 번만 받는다', async () => {
    const prefetch = vi.fn<PrefetchDraft>(() => Promise.resolve({ status: 'DRAFT' }));
    const { result } = setup(prefetch);

    result.current.warm('7');
    await act(() => result.current.open('7'));

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/bunch/drafts/7');
  });

  it('닿을 때 확인한 초안이 이미 발행됐으면 이동하지 않고 안내한다', async () => {
    const { result, onGone } = setup(() => Promise.resolve({ status: 'PUBLISHED' }));

    result.current.warm('7');
    await act(() => result.current.open('7'));

    expect(push).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.draftGonePublished);
    expect(onGone).toHaveBeenCalled();
  });

  it('누른 뒤 다음 누름은 최신 상태를 새로 받는다', async () => {
    const prefetch = vi.fn<PrefetchDraft>(() => Promise.resolve({ status: 'DRAFT' }));
    const { result } = setup(prefetch);

    await act(() => result.current.open('7'));
    await act(() => result.current.open('7'));

    expect(prefetch).toHaveBeenCalledTimes(2);
  });
});
