import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { UPLOAD_STATUS_COLLAPSE_AT, type UploadStatus } from '../../lib/uploadStatus';
import { PhotoUploadStatus } from './PhotoUploadStatus';

const uploading = (done: number, total = 4, id = 1): UploadStatus => ({
  phase: 'uploading',
  id,
  total,
  done,
  steps: done * 2,
  progress: done / total,
  thumbnailUrl: 'blob:thumb',
});

const complete = (overrides: Partial<Extract<UploadStatus, { phase: 'complete' }>> = {}) =>
  ({
    phase: 'complete',
    id: 1,
    total: 4,
    done: 4,
    steps: 8,
    progress: 1,
    thumbnailUrl: 'blob:thumb',
    message: '4장의 사진을 사진함에 추가했어요.',
    withBundleHint: true,
    shownAt: Date.now(),
    ...overrides,
  }) satisfies UploadStatus;

afterEach(() => {
  vi.useRealTimers();
});

describe('PhotoUploadStatus', () => {
  it('상태가 없으면 아무것도 그리지 않는다', () => {
    render(<PhotoUploadStatus status={undefined} bunchName="여행가조" />);

    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('올리는 중에는 번치 이름·장수 문구와 끝난 장수만큼의 진행 바를 보인다', () => {
    const { container } = render(<PhotoUploadStatus status={uploading(1)} bunchName="여행가조" />);

    const bar = screen.getByRole('progressbar', { name: '여행가조에 4장 업로드 중..' });
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('4');
    // 1장 끝남 = 8칸 중 2칸: 막대를 75%만큼 왼쪽으로 밀어 25%만 보임
    expect((bar.firstElementChild as HTMLElement).style.transform).toBe('translateX(-75%)');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:thumb');
  });

  it('완료되면 결과 문구와 둘째 줄 안내를 보이고 올리는 중 문구는 보조기기에서 숨긴다', () => {
    const { rerender } = render(<PhotoUploadStatus status={uploading(3)} bunchName="여행가조" />);
    rerender(<PhotoUploadStatus status={complete()} bunchName="여행가조" />);

    expect(screen.getByText('4장의 사진을 사진함에 추가했어요.')).toBeTruthy();
    expect(screen.getByText(PHOTO_BOX_MESSAGES.uploadStatusBundleHint)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe(
      '4',
    );
  });

  it('모두 추가되지 않았으면 둘째 줄 안내가 없다', () => {
    render(
      <PhotoUploadStatus
        status={complete({ message: '사진을 올리지 못했어요.', withBundleHint: false })}
        bunchName="여행가조"
      />,
    );

    expect(screen.getByText('사진을 올리지 못했어요.')).toBeTruthy();
    expect(screen.queryByText(PHOTO_BOX_MESSAGES.uploadStatusBundleHint)).toBeNull();
  });

  it('완료 시각 기준으로 유지 시간이 지나면 접힌다(다시 들어와도 남은 시간만 기다림)', () => {
    vi.useFakeTimers();
    // 완료된 지 1초 뒤에 화면에 들어온 경우
    const status = complete({ shownAt: Date.now() - 1000 });
    const { container } = render(<PhotoUploadStatus status={status} bunchName="여행가조" />);
    const root = container.firstElementChild;
    expect(root?.className).toContain('grid-rows-[1fr]');

    act(() => {
      vi.advanceTimersByTime(UPLOAD_STATUS_COLLAPSE_AT - 1000 - 1);
    });
    expect(root?.className).toContain('grid-rows-[1fr]');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(root?.className).toContain('grid-rows-[0fr]');
    // 접히기 시작하면 보조기기에서도 숨김
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('inert')).toBe(true);
  });

  it('첫 사진을 받기만 해도(결과 전) 진행 바가 움직인다', () => {
    const status: UploadStatus = { ...uploading(0), steps: 1, progress: 1 / 8 };
    render(<PhotoUploadStatus status={status} bunchName="여행가조" />);

    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.transform).toBe('translateX(-87.5%)');
  });

  it('완료 문구 중 새로 올리면 진행 바를 새로 그려 처음부터 채운다', () => {
    const { rerender } = render(<PhotoUploadStatus status={complete()} bunchName="여행가조" />);
    const before = screen.getByRole('progressbar', { hidden: true });
    rerender(<PhotoUploadStatus status={uploading(0, 2, 2)} bunchName="여행가조" />);

    const after = screen.getByRole('progressbar', { name: '여행가조에 2장 업로드 중..' });
    expect(after).not.toBe(before);
    expect(after.getAttribute('aria-valuenow')).toBe('0');
  });

  it('번치 이름이 길면 이름만 줄이고 장수 문구는 남긴다', () => {
    render(
      <PhotoUploadStatus
        status={uploading(0)}
        bunchName="아주아주아주긴번치이름입니다아주긴번치"
      />,
    );

    const name = screen.getByText('아주아주아주긴번치이름입니다아주긴번치');
    expect(name.className).toContain('truncate');
    expect(screen.getByText('에 4장 업로드 중..').className).toContain('shrink-0');
  });
});
