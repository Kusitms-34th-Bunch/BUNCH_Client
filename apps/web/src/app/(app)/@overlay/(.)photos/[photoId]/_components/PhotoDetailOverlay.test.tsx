import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoDetailOverlay } from './PhotoDetailOverlay';

let pathname = '/photos/3';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const renderOverlay = () => {
  const view = render(
    <>
      <div data-overlay-under="">사진함</div>
      <PhotoDetailOverlay>
        <h1>사진 상세</h1>
      </PhotoDetailOverlay>
    </>,
  );
  const navigate = (next: string) => {
    pathname = next;
    act(() =>
      view.rerender(
        <>
          <div data-overlay-under="">사진함</div>
          <PhotoDetailOverlay>
            <h1>사진 상세</h1>
          </PhotoDetailOverlay>
        </>,
      ),
    );
  };
  return { navigate };
};

afterEach(() => {
  pathname = '/photos/3';
});

describe('PhotoDetailOverlay', () => {
  it('사진 상세 주소인 동안 사진함 위에 뜨고 뒤 사진함은 inert', () => {
    renderOverlay();
    expect(screen.getByRole('heading', { name: '사진 상세' })).toBeInTheDocument();
    expect(document.querySelector('[data-overlay-under]')).toHaveAttribute('inert');
  });

  it('상세에서 사진을 넘겨 주소가 다른 사진으로 바뀌어도 닫히지 않는다', () => {
    const { navigate } = renderOverlay();
    navigate('/photos/5');
    expect(screen.getByRole('heading', { name: '사진 상세' })).toBeInTheDocument();
  });

  it('사진함으로 돌아가면 닫히고 사진함을 다시 누를 수 있다', () => {
    const { navigate } = renderOverlay();
    navigate('/photos');
    expect(screen.queryByRole('heading', { name: '사진 상세' })).toBeNull();
    expect(document.querySelector('[data-overlay-under]')).not.toHaveAttribute('inert');
  });
});
