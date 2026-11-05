import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoCropScreen } from './PhotoCropScreen';

vi.mock('../loading/LoadingDots', () => ({ LoadingDots: () => null }));

const SRC = 'data:image/jpeg;base64,AAAA';

// jsdom은 이미지를 디코딩하지 않아 원본 크기를 직접 넣고 load를 보냄
const loadImage = (width: number, height: number) => {
  const image = document.querySelector('img');
  if (!image) throw new Error('img 없음');
  Object.defineProperty(image, 'naturalWidth', { value: width });
  Object.defineProperty(image, 'naturalHeight', { value: height });
  fireEvent.load(image);
  return image;
};

afterEach(() => vi.restoreAllMocks());

describe('PhotoCropScreen', () => {
  it('사진이 없으면 「사진을 불러오는 중」을 알리고 완료를 막는다', () => {
    render(
      <PhotoCropScreen src={undefined} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />,
    );

    expect(screen.getByRole('status').textContent).toContain('사진을 불러오는 중');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '완료' }).disabled).toBe(true);
  });

  it('사진을 불러오면 안내 문구를 보이고 완료하면 원 영역을 512px JPEG로 잘라 넘긴다', async () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      fillRect,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,BBBB',
    );
    const onComplete = vi.fn();
    render(
      <PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={onComplete} onFail={vi.fn()} />,
    );
    const image = loadImage(504, 504);

    expect(screen.getByText('원하는 부분에 원을 맞춰주세요.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    // 투명 사진이 검게 나오지 않도록 흰 바탕을 먼저 칠함
    expect(fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
    const [fillOrder = 0] = fillRect.mock.invocationCallOrder;
    const [drawOrder = 0] = drawImage.mock.invocationCallOrder;
    expect(fillOrder).toBeLessThan(drawOrder);
    // 화면 폭 0(jsdom)이라 배율은 원(252)/504 = 0.5, 원이 사진 전체를 덮음
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 504, 504, 0, 0, 512, 512);
    expect(onComplete).toHaveBeenCalledWith('data:image/jpeg;base64,BBBB');
  });

  it('자르기용 canvas를 만들지 못하면 완료 대신 실패를 알린다', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const onComplete = vi.fn();
    const onFail = vi.fn();
    render(
      <PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={onComplete} onFail={onFail} />,
    );
    loadImage(504, 504);

    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('사진을 디코딩하지 못하면 실패를 알린다', () => {
    const onFail = vi.fn();
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={onFail} />);
    const image = document.querySelector('img');
    if (!image) throw new Error('img 없음');

    fireEvent.error(image);

    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('방향키로 사진을 옮기되 원이 사진 밖으로 나가지 않게 막는다', () => {
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    // 배율 0.5 → 그려진 크기 504×252, 가로로만 (504-252)/2 = 126까지
    const image = loadImage(1008, 504);
    const area = screen.getByRole('button', { name: /사진 위치 조정/ });
    const left = () => Number.parseFloat(image.style.left);
    const start = left();

    fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(left() - start).toBe(10);

    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(left() - start).toBe(126);

    // 높이는 원과 같아(252) 세로로는 움직이지 않음
    const top = image.style.top;
    fireEvent.keyDown(area, { key: 'ArrowDown' });
    expect(image.style.top).toBe(top);
  });

  it('뒤로 가기와 Esc는 조정을 취소한다', async () => {
    const onCancel = vi.fn();
    render(<PhotoCropScreen src={SRC} onCancel={onCancel} onComplete={vi.fn()} onFail={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('열리면 조정 영역에 초점을 두고 뒤 화면을 막았다가 닫히면 풀어 준다', () => {
    const { container, unmount } = render(
      <PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />,
    );

    expect(screen.getByRole('dialog', { name: '프로필 사진 조정' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '사진 위치 조정' }));
    expect(container.inert).toBe(true);

    unmount();
    expect(container.inert).toBe(false);
  });
});
