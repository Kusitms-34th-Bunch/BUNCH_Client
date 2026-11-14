import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { BundleSelectProvider } from '../../contexts/BundleSelectProvider';
import { clearPhotoBoxEntry, startFromPhotoBox } from '../../lib/photoBoxEntry';
import { DOUBLE_CREATE_DELAY_MS } from '../../testing/selectScreenDoubles';
import { BundleMemberSelect } from './BundleMemberSelect';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/features/photo-box/hooks/usePhotoBox', async () => ({
  usePhotoBox: (await import('../../testing/selectScreenDoubles')).usePhotoBoxDouble,
}));
vi.mock('../../hooks/useCreateBundle', async () => ({
  useCreateBundle: (await import('../../testing/selectScreenDoubles')).useCreateBundleDouble,
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

const renderMembers = () =>
  render(
    <BundleSelectProvider>
      <BundleMemberSelect />
    </BundleSelectProvider>,
  );

const nextButton = () => screen.getByRole('button', { name: '다음' });
// 사진함 샘플의 나는 은우라 목록에는 없음. 이름은 보이는 글자(추가하기·추가됨)로 시작
const addButton = (name: string) =>
  screen.getByRole('button', { name: new RegExp('^추가(하기|됨), ' + name + '$') });

beforeEach(() => {
  vi.clearAllMocks();
  clearPhotoBoxEntry();
});

describe('멤버 선택', () => {
  it('나를 뺀 번치 멤버를 「추가하기」 칩과 함께 보여 주고 「다음」은 꺼져 있다', () => {
    renderMembers();

    expect(screen.getByRole('heading', { name: '누구와 함께 만들까요?' })).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).queryByText('은우')).toBeNull();
    expect(within(list).getByText('경진')).toBeInTheDocument();
    expect(addButton('경진')).toHaveTextContent('추가하기');
    expect(addButton('경진')).toHaveAttribute('aria-pressed', 'false');
    expect(nextButton()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('추가한 멤버가 없어요.');
  });

  it('「추가하기」를 누르면 「추가됨」이 되고 「다음」이 켜지며 다시 누르면 해제된다', async () => {
    renderMembers();

    await userEvent.click(addButton('경진'));
    expect(addButton('경진')).toHaveTextContent('추가됨');
    expect(addButton('경진')).toHaveAttribute('aria-pressed', 'true');
    expect(nextButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('1명 추가됨');

    await userEvent.click(addButton('경진'));
    expect(addButton('경진')).toHaveTextContent('추가하기');
    expect(nextButton()).toBeDisabled();
  });

  it('보이는 글자로 시작하는 이름이 추가 상태를 따라 바뀐다', async () => {
    renderMembers();

    expect(screen.getByRole('button', { name: '추가하기, 경진' })).toBeInTheDocument();
    await userEvent.click(addButton('경진'));
    expect(screen.getByRole('button', { name: '추가됨, 경진' })).toBeInTheDocument();
  });

  it('「다음」은 사진 선택으로 이동한다', async () => {
    renderMembers();

    await userEvent.click(addButton('수인'));
    await userEvent.click(nextButton());

    expect(router.push).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('돌아갈 기록이 없으면 뒤로 가기가 번치 홈으로 이동한다', async () => {
    renderMembers();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.bunchHome);
  });

  it('사진함에서 넘어왔으면 「다음」이 사진 선택 없이 바로 초안을 만들고 기록에 멤버 선택을 남기지 않는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      startFromPhotoBox([photoBoxFixture.photos[0]!.id]);
      renderMembers();

      await userEvent.click(addButton('경진'));
      await userEvent.click(nextButton());

      expect(router.push).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(BUNDLE_SELECT_MESSAGES.creating);
      await act(() => vi.advanceTimersByTimeAsync(DOUBLE_CREATE_DELAY_MS));
      expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.draft('draft-1'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('사진함에서 넘어왔고 고른 사진이 모두 사라졌으면 사진함으로 돌아간다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    startFromPhotoBox(['ghost-photo']);
    renderMembers();

    await userEvent.click(addButton('경진'));
    await userEvent.click(nextButton());

    expect(router.replace).toHaveBeenCalledWith('/photos');
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toHaveTextContent(BUNDLE_SELECT_MESSAGES.creating);
  });

  it('사진함에서 넘어왔고 일부 사진만 사라졌으면 안내 없이 남은 사진으로 바로 만든다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      startFromPhotoBox([photoBoxFixture.photos[0]!.id, 'ghost-photo']);
      renderMembers();

      await userEvent.click(addButton('경진'));
      await userEvent.click(nextButton());

      expect(screen.getByRole('status')).toHaveTextContent(BUNDLE_SELECT_MESSAGES.creating);
      await act(() => vi.advanceTimersByTimeAsync(DOUBLE_CREATE_DELAY_MS));
      expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.draft('draft-1'));
    } finally {
      vi.useRealTimers();
    }
  });
});
