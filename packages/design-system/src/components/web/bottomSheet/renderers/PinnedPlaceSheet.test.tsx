import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PinnedPlaceSheet } from './PinnedPlaceSheet';

afterEach(cleanup);

const renderSheet = (overrides: Partial<Parameters<typeof PinnedPlaceSheet>[0]> = {}) => {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    placeName: '봄날카페',
    address: '제주 제주시 애월읍',
    onViewBundles: vi.fn(),
    onCopyAddress: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<PinnedPlaceSheet {...props} />);
  return props;
};

describe('PinnedPlaceSheet', () => {
  it('장소 이름이 시트 이름, 주소가 설명이고 항목마다 콜백을 부른다', async () => {
    const props = renderSheet();

    const dialog = await screen.findByRole('dialog', { name: '봄날카페' });
    const descriptionId = dialog.getAttribute('aria-describedby');
    expect(descriptionId && document.getElementById(descriptionId)?.textContent).toBe(
      '제주 제주시 애월읍',
    );

    fireEvent.click(screen.getByRole('button', { name: '콕했던 번들 보러가기' }));
    fireEvent.click(screen.getByRole('button', { name: '주소 복사하기' }));
    fireEvent.click(screen.getByRole('button', { name: '콕에서 빼기' }));
    expect(props.onViewBundles).toHaveBeenCalledTimes(1);
    expect(props.onCopyAddress).toHaveBeenCalledTimes(1);
    expect(props.onRemove).toHaveBeenCalledTimes(1);
    // 항목을 눌러도 시트는 닫지 않음
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it('사진은 장식이고, 없으면 회색 자리를 둔다', async () => {
    renderSheet({ imageSrc: '/place.jpg' });
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('');
    cleanup();

    renderSheet();
    expect((await screen.findByRole('dialog')).querySelector('img')).toBeNull();
  });

  it('「닫기」는 닫기를 요청한다', async () => {
    const props = renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: '닫기' }));

    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
  });
});
