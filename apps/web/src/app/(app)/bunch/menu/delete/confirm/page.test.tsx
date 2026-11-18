import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchDeleteConfirmPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  BunchDelete: ({ targetId }: { targetId?: string }) => (
    <div data-testid="bunch-delete">{targetId ?? '(없음)'}</div>
  ),
}));

const renderPage = async (bunch?: string | string[]) =>
  BunchDeleteConfirmPage({ searchParams: Promise.resolve(bunch === undefined ? {} : { bunch }) });

describe('/bunch/menu/delete/confirm page', () => {
  it('전환 경계(data-ssgoi-transition)를 확인 경로로 지정한다', async () => {
    expect((await renderPage('1')).props).toMatchObject({
      'data-ssgoi-transition': '/bunch/menu/delete/confirm',
    });
  });

  it('주소의 번치를 삭제 대상으로 넘긴다', async () => {
    render(await renderPage('1'));

    expect(screen.getByTestId('bunch-delete')).toHaveTextContent('1');
  });

  it('대상이 없거나 여러 개면 대상 없이 넘긴다(화면이 안내로 돌려보냄)', async () => {
    const { unmount } = render(await renderPage());
    expect(screen.getByTestId('bunch-delete')).toHaveTextContent('(없음)');
    unmount();

    render(await renderPage(['1', '2']));
    expect(screen.getByTestId('bunch-delete')).toHaveTextContent('(없음)');
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
