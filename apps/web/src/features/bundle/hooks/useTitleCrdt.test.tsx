import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import {
  createTitleDoc,
  editTitle,
  ensureTitleCrdt,
  loadTitleDoc,
  saveTitleDoc,
} from '../lib/titleCrdt';
import { useTitleCrdt } from './useTitleCrdt';

let serverState = '';
beforeAll(async () => {
  await ensureTitleCrdt();
  serverState = saveTitleDoc(createTitleDoc('부산 여행'));
});
const detail = (titleCrdtState: string | undefined, id = '1'): BundleDetail =>
  ({ id, status: 'DRAFT', titleCrdtState }) as BundleDetail;

const render = (initial: BundleDetail | undefined) =>
  renderHook(({ value }) => useTitleCrdt(value), { initialProps: { value: initial } });

describe('useTitleCrdt', () => {
  it('서버 문서를 불러오기 전에는 입력을 받지 않고 불러오면 제목 원문을 보인다', async () => {
    const { result } = render(detail(undefined));
    expect(result.current.edit('가')).toBe(false);
    expect(result.current.serialize()).toBeUndefined();

    const { result: loaded } = render(detail(serverState));
    await waitFor(() => expect(loaded.current.text).toBe('부산 여행'));
  });

  it('입력은 문서에 바로 반영되고 서버로 보낼 문서에도 담긴다', async () => {
    const { result } = render(detail(serverState));
    await waitFor(() => expect(result.current.text).toBe('부산 여행'));

    act(() => {
      result.current.edit('부산 맛집 여행');
    });

    expect(result.current.text).toBe('부산 맛집 여행');
    expect(loadTitleDoc(result.current.serialize() ?? '').title).toBe('부산 맛집 여행');
  });

  it('저장 전 입력이 있는 채로 다른 멤버의 변경이 오면 둘 다 남고, 같은 문서가 또 와도 같다', async () => {
    const { result, rerender } = render(detail(serverState));
    await waitFor(() => expect(result.current.text).toBe('부산 여행'));
    act(() => {
      result.current.edit('부산 여행기');
    });

    const theirs = saveTitleDoc(editTitle(loadTitleDoc(serverState), '가을 부산 여행'));
    rerender({ value: detail(theirs) });
    await waitFor(() => expect(result.current.text).toContain('가을'));
    expect(result.current.text).toContain('여행기');
    const merged = result.current.text;

    rerender({ value: detail(theirs) });
    rerender({ value: detail(serverState) });
    await waitFor(() => expect(result.current.text).toBe(merged));
  });

  it('한글 조합 중에는 원격 변경을 화면에 반영하지 않고 조합이 끝난 뒤 반영한다', async () => {
    const { result, rerender } = render(detail(serverState));
    await waitFor(() => expect(result.current.text).toBe('부산 여행'));
    act(() => {
      result.current.setComposing(true);
      result.current.edit('부산 여행ㄱ');
    });

    const theirs = saveTitleDoc(editTitle(loadTitleDoc(serverState), '가을 부산 여행'));
    rerender({ value: detail(theirs) });
    // 조합 중에는 내 입력만 보임(병합은 문서에서 이미 됨)
    await act(async () => {
      await ensureTitleCrdt();
    });
    expect(result.current.text).toBe('부산 여행ㄱ');

    act(() => result.current.setComposing(false));

    expect(result.current.text).toContain('가을');
    expect(result.current.text).toContain('ㄱ');
  });

  it('발행본에는 문서가 없어 입력을 받지 않는다', () => {
    const published = { ...detail(serverState), status: 'PUBLISHED' } as BundleDetail;
    const { result } = render(published);

    expect(result.current.edit('가')).toBe(false);
  });
});
