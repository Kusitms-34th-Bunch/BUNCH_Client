import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoUploadSheet } from './PhotoUploadSheet';

afterEach(cleanup);

const renderSheet = (props: Partial<Parameters<typeof PhotoUploadSheet>[0]> = {}) =>
  render(
    <PhotoUploadSheet
      open
      onOpenChange={() => {}}
      title="퇴근런클럽에 사진 올리기"
      onSelectAlbum={() => {}}
      onTakePhoto={() => {}}
      {...props}
    />,
  );

describe('PhotoUploadSheet', () => {
  it('제목이 시트 이름이고 두 방식을 보여 준다', async () => {
    renderSheet();

    expect(await screen.findByRole('dialog', { name: '퇴근런클럽에 사진 올리기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '앨범에서 선택' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '카메라로 찍기' })).toBeTruthy();
  });

  it('카드마다 해당 콜백을 부르고 스스로 닫지 않는다', async () => {
    const onSelectAlbum = vi.fn();
    const onTakePhoto = vi.fn();
    const onOpenChange = vi.fn();
    renderSheet({ onSelectAlbum, onTakePhoto, onOpenChange });

    fireEvent.click(await screen.findByRole('button', { name: '앨범에서 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '카메라로 찍기' }));

    expect(onSelectAlbum).toHaveBeenCalledTimes(1);
    expect(onTakePhoto).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('화면에 없는 닫기 버튼으로도 닫기를 요청한다', async () => {
    const onOpenChange = vi.fn();
    renderSheet({ onOpenChange });

    fireEvent.click(await screen.findByRole('button', { name: '닫기' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });
});
