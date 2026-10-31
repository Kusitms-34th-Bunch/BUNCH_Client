import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type PlayerProps = { autoplay?: boolean; loop?: boolean };
const playerProps: PlayerProps[] = [];

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

// 로딩 캐시가 모듈 단위라 테스트마다 모듈을 새로 불러옴
const loadComponent = async () => (await import('./LoadingDots')).LoadingDots;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('@/shared/lib/lottieLight');
  vi.resetModules();
  playerProps.length = 0;
});

// 모듈을 새로 불러오는 테스트라 첫 실행은 디자인 시스템 번들 변환 때문에 느림
const SLOW_MODULE_TIMEOUT_MS = 20000;

describe('LoadingDots', () => {
  it(
    '받은 로티를 재생하고 반복한다',
    async () => {
      stubMotion(false);
      vi.doMock('@/shared/lib/lottieLight', () => ({
        LottieLight: (props: PlayerProps) => {
          playerProps.push(props);
          return <span data-testid="lottie" />;
        },
      }));
      const LoadingDots = await loadComponent();

      const { findByTestId } = render(<LoadingDots />);
      await findByTestId('lottie');

      expect(playerProps.at(-1)).toMatchObject({ autoplay: true, loop: true });
    },
    SLOW_MODULE_TIMEOUT_MS,
  );

  it(
    '동작 줄이기에서는 재생과 반복 없이 첫 프레임만 둔다',
    async () => {
      stubMotion(true);
      vi.doMock('@/shared/lib/lottieLight', () => ({
        LottieLight: (props: PlayerProps) => {
          playerProps.push(props);
          return <span data-testid="lottie" />;
        },
      }));
      const LoadingDots = await loadComponent();

      const { findByTestId } = render(<LoadingDots />);
      await findByTestId('lottie');

      expect(playerProps.at(-1)).toMatchObject({ autoplay: false, loop: false });
    },
    SLOW_MODULE_TIMEOUT_MS,
  );

  it(
    '로티를 받지 못하면 EditingAnimation으로 대체한다',
    async () => {
      stubMotion(false);
      vi.doMock('@/shared/lib/lottieLight', () => {
        throw new Error('load failed');
      });
      const LoadingDots = await loadComponent();

      const { container } = render(<LoadingDots />);

      await waitFor(() => expect(container.querySelector('[class*="_dot_"]')).not.toBeNull());
      expect(container.querySelector('[data-testid="lottie"]')).toBeNull();
    },
    SLOW_MODULE_TIMEOUT_MS,
  );
});
