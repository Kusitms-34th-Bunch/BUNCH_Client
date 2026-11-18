import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoCropScreen } from './PhotoCropScreen';

vi.mock('../loading/LoadingRipple', () => ({ LoadingRipple: () => null }));

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

// jsdom은 레이아웃이 없어 조정 영역 크기를 375×600으로 둠
const STAGE = { width: 375, height: 600 };
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(STAGE.width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(STAGE.height);
});
afterEach(() => vi.restoreAllMocks());

const mockCanvas = () => {
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    fillRect,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,BBBB');
  return { drawImage, fillRect };
};

describe('PhotoCropScreen', () => {
  it('사진이 없으면 「사진을 불러오는 중」을 알리고 완료를 막는다', () => {
    render(
      <PhotoCropScreen src={undefined} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />,
    );

    expect(screen.getByRole('status').textContent).toContain('사진을 불러오는 중');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '완료' }).disabled).toBe(true);
  });

  it('사진을 불러오면 안내 문구를 보이고 완료하면 원 영역을 512px JPEG로 잘라 넘긴다', async () => {
    const { drawImage, fillRect } = mockCanvas();
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
    // 정사각 사진은 원이 사진 전체를 덮음
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

  it('가로 사진은 처음 칸이 사진 전체이고, 원(사진 높이)이 덮는 가운데를 자른다', async () => {
    const { drawImage } = mockCanvas();
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    const image = loadImage(750, 504);

    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(drawImage).toHaveBeenCalledWith(image, 123, 0, 504, 504, 0, 0, 512, 512);
  });

  it('세로 사진은 처음 칸이 폭만 한 가운데 정사각형이고, 옮긴 자리를 자른다', async () => {
    const { drawImage } = mockCanvas();
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    // 375×502로 그려지고 칸 375×375, 위로 (502-375)/2 = 63.5px까지
    const image = loadImage(750, 1004);
    const area = screen.getByRole('button', { name: /자를 영역 조정/ });

    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(area, { key: 'ArrowUp' });
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 750, 750, 0, 0, 512, 512);
  });

  it('+·- 키로 가운데와 비율을 유지한 채 칸을 줄이고, 줄인 칸은 어디로든 옮겨 바뀐 상태를 읽어 준다', async () => {
    const { drawImage } = mockCanvas();
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    const image = loadImage(504, 504);
    const area = screen.getByRole('button', { name: /자를 영역 조정/ });

    fireEvent.keyDown(area, { key: '-' });
    for (let i = 0; i < 20; i += 1) {
      fireEvent.keyDown(area, { key: 'ArrowLeft' });
      fireEvent.keyDown(area, { key: 'ArrowUp' });
    }
    // 504 / 1.1 ≈ 458 → 91%, 왼쪽 위 끝에서 원 가운데는 약 45%
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(
      '칸 가로 91%, 세로 91%, 원 가운데 가로 45%·세로 45% 위치',
    );
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    const [drawn, x, y, size] = drawImage.mock.calls[0] as [unknown, number, number, number];
    expect(drawn).toBe(image);
    expect([x, y]).toEqual([0, 0]);
    expect(size).toBeCloseTo(504 / 1.1, 3);
  });

  it('오른쪽 아래 꺾쇠를 왼쪽으로 끌면 폭만 줄고 원도 같이 줄어 그 자리를 자른다', async () => {
    const { drawImage } = mockCanvas();
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    // 750×504 → 375×252, 영역(375×600) 세로 가운데라 사진 위쪽 174px. 칸 오른쪽 아래는 (375, 426)
    const image = loadImage(750, 504);
    const area = screen.getByRole('button', { name: /자를 영역 조정/ });
    area.setPointerCapture = vi.fn();
    const corner = document.querySelector('[data-crop-corner="1,1"]')!;

    fireEvent.pointerDown(corner, { pointerId: 1, button: 0, clientX: 375, clientY: 426 });
    fireEvent.pointerMove(area, { pointerId: 1, clientX: 250, clientY: 426 });
    fireEvent.pointerUp(area, { pointerId: 1, clientX: 250, clientY: 426 });
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    // 칸 500×504(원본) → 원 지름 500, 칸 세로 가운데
    expect(drawImage).toHaveBeenCalledWith(image, 0, 2, 500, 500, 0, 0, 512, 512);
  });

  it('칸 안을 끌면 가로·세로로 옮기고, 사진 밖으로 넘겨도 놓으면 끝에 맞춘다', async () => {
    const { drawImage } = mockCanvas();
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    const image = loadImage(504, 504);
    const area = screen.getByRole('button', { name: /자를 영역 조정/ });
    area.setPointerCapture = vi.fn();
    fireEvent.keyDown(area, { key: '-' });

    fireEvent.pointerDown(area, { pointerId: 2, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(area, { pointerId: 2, clientX: 900, clientY: 900 });
    fireEvent.pointerUp(area, { pointerId: 2, clientX: 900, clientY: 900 });
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    const [, x, y, size] = drawImage.mock.calls[0] as [unknown, number, number, number];
    expect(x + size).toBeCloseTo(504, 3);
    expect(y + size).toBeCloseTo(504, 3);
    expect(image).toBeTruthy();
  });

  it('Ctrl·Cmd·Alt 조합 키는 브라우저 단축키로 남겨 둔다', () => {
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    loadImage(504, 504);
    const area = screen.getByRole('button', { name: /자를 영역 조정/ });

    // 기본 동작이 막히지 않으면 fireEvent가 true를 돌려줌
    expect(fireEvent.keyDown(area, { key: '-', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(area, { key: '=', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(area, { key: 'ArrowLeft', altKey: true })).toBe(true);
    expect(fireEvent.keyDown(area, { key: '-' })).toBe(false);
  });

  it('모서리 꺾쇠 네 개를 그린다(끌어서 크기 조절)', () => {
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    loadImage(750, 504);
    expect(document.querySelectorAll('[data-crop-corner]')).toHaveLength(4);
  });

  it('조정 영역 크기를 모르면 완료를 막는다(빈 사진이 저장되지 않게)', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0);
    render(<PhotoCropScreen src={SRC} onCancel={vi.fn()} onComplete={vi.fn()} onFail={vi.fn()} />);
    loadImage(750, 504);

    expect(screen.getByRole<HTMLButtonElement>('button', { name: '완료' }).disabled).toBe(true);
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
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '자를 영역 조정' }));
    expect(container.inert).toBe(true);

    unmount();
    expect(container.inert).toBe(false);
  });
});
