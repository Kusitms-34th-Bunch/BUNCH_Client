import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoImportSheet } from './PhotoImportSheet';

afterEach(cleanup);

const renderSheet = (props: Partial<Parameters<typeof PhotoImportSheet>[0]> = {}) =>
  render(
    <PhotoImportSheet
      open
      onOpenChange={() => {}}
      onSelectBunchBox={() => {}}
      onSelectGallery={() => {}}
      {...props}
    />,
  );

describe('PhotoImportSheet', () => {
  it('「어디서 사진을 가져올까요?」가 시트 이름이고 두 출처를 보여 준다', async () => {
    renderSheet();

    expect(await screen.findByRole('dialog', { name: '어디서 사진을 가져올까요?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '번치 사진함에서 가져오기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '내 갤러리에서 가져오기' })).toBeTruthy();
  });

  it('카드마다 설명이 붙는다', async () => {
    renderSheet();

    expect(
      await screen.findByRole('button', {
        name: '번치 사진함에서 가져오기',
        description: '번치 사진함에 저장된 사진을 선택해요.',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: '내 갤러리에서 가져오기',
        description: '휴대폰에 저장된 사진을 선택해요.',
      }),
    ).toBeTruthy();
  });

  it('카드마다 해당 콜백을 부르고 스스로 닫지 않는다', async () => {
    const onSelectBunchBox = vi.fn();
    const onSelectGallery = vi.fn();
    const onOpenChange = vi.fn();
    renderSheet({ onSelectBunchBox, onSelectGallery, onOpenChange });

    fireEvent.click(await screen.findByRole('button', { name: '번치 사진함에서 가져오기' }));
    fireEvent.click(screen.getByRole('button', { name: '내 갤러리에서 가져오기' }));

    expect(onSelectBunchBox).toHaveBeenCalledTimes(1);
    expect(onSelectGallery).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('화면에 없는 닫기 버튼으로도 닫기를 요청한다', async () => {
    const onOpenChange = vi.fn();
    renderSheet({ onOpenChange });

    fireEvent.click(await screen.findByRole('button', { name: '닫기' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });
});
