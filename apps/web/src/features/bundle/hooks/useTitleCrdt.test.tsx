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

  it('조합 중 보류한 원격 변경이 있는 채로 입력이 이어져도 원격 변경을 지우지 않는다', async () => {
    const { result, rerender } = render(detail(serverState));
    await waitFor(() => expect(result.current.text).toBe('부산 여행'));
    act(() => {
      result.current.setComposing(true);
      result.current.edit('부산 여행ㄱ');
    });
    const theirs = saveTitleDoc(editTitle(loadTitleDoc(serverState), '가을 부산 여행'));
    rerender({ value: detail(theirs) });
    await act(async () => {
      await ensureTitleCrdt();
    });

    // 아직 보이지 않는 원격 변경 위에 다음 글자 입력(화면 문자열 기준)
    act(() => {
      result.current.edit('부산 여행가');
    });
    expect(result.current.text).toBe('부산 여행가');
    act(() => result.current.setComposing(false));

    // 원격 변경(가을)과 로컬 마지막 글자(가)가 둘 다 남은 최종 결과(접두사 일치만으로는 통과하지 않음)
    expect(result.current.text).toBe('가을 부산 여행가');
    expect(loadTitleDoc(result.current.serialize() ?? '').title).toBe(result.current.text);
  });

  it('서버 문서가 손상돼 읽지 못하면 불러오기 실패로 알린다', async () => {
    const { result } = render(detail('not-base64!!'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.ready).toBe(false);
  });

  it('발행본에는 문서가 없어 입력을 받지 않는다', () => {
    const published = { ...detail(serverState), status: 'PUBLISHED' } as BundleDetail;
    const { result } = render(published);

    expect(result.current.edit('가')).toBe(false);
  });
});
