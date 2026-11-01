import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recommendation } from '../lib/recommendation';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { BundleSelectProvider } from '../contexts/BundleSelectProvider';
import { BundleSelect } from './BundleSelect';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const renderSelect = (recommendations?: readonly Recommendation[], createDelayMs = 0) =>
  render(
    <BundleSelectProvider createDelayMs={createDelayMs} recommendations={recommendations}>
      <BundleSelect currentYear={2026} />
    </BundleSelectProvider>,
  );

const createButton = () => screen.getByRole('button', { name: '번들 만들기' });
const recommendButton = () => screen.getByRole('button', { name: '추천 번들' });
// 사진함 샘플의 9월 27일 섹션: 고를 수 있는 사진 5장(처리 중 1장은 회색 자리표시)
const sectionPhotos = () =>
  within(screen.getByRole('region', { name: '9월 27일 일요일' })).getAllByRole('button');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('사진 고르기', () => {
  it('처음에는 고른 사진이 없어 「번들 만들기」가 비활성이고 「추천 번들」은 켜져 있다', () => {
    renderSelect();

    expect(createButton()).toBeDisabled();
    expect(recommendButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('선택한 사진이 없어요.');
  });

  it('고른 순서대로 번호가 붙고 칩에 선택 개수가 보이며 「번들 만들기」가 켜진다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(sectionPhotos()[1]!);

    expect(createButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('2장 선택됨');
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeInTheDocument();
    expect(sectionPhotos()[0]).toHaveTextContent('1');
    expect(sectionPhotos()[1]).toHaveTextContent('2');
  });

  it('고른 사진을 다시 누르면 해제되고 모두 해제하면 「번들 만들기」가 다시 꺼진다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(sectionPhotos()[0]!);

    expect(createButton()).toBeDisabled();
    expect(screen.getByRole('radio', { name: '전체' })).toBeInTheDocument();
  });

  it('멤버 필터를 바꿔도 고른 사진은 유지된다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(screen.getByRole('radio', { name: /^은우/ }));

    expect(screen.getByRole('status')).toHaveTextContent('1장 선택됨');
  });

  it('「번들 만들기」를 누르면 생성 중으로 알리고 헤더·하단을 막은 뒤 작성 화면으로 이동한다', async () => {
    renderSelect(undefined, 50);

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(createButton());

    expect(screen.getByRole('status')).toHaveTextContent(BUNDLE_SELECT_MESSAGES.creating);
    expect(
      screen.getByRole('button', { name: '뒤로 가기', hidden: true }).closest('[inert]'),
    ).not.toBeNull();
    expect(createButton().closest('[inert]')).not.toBeNull();
    expect(router.push).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.draft('draft-1')),
    );
  });

  it('돌아갈 기록이 없으면 뒤로 가기가 번치 홈으로 이동한다', async () => {
    renderSelect();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.bunchHome);
  });
});

describe('추천 번들 시트', () => {
  it('카드를 하나 골라야 「적용하기」가 켜지고 다시 누르면 해제된다', async () => {
    renderSelect();

    await userEvent.click(recommendButton());
    const apply = await screen.findByRole('button', { name: '적용하기' });
    expect(apply).toBeDisabled();

    const card = screen.getAllByRole('button', { name: '성수동 러닝 모임' })[0]!;
    await userEvent.click(card);
    expect(apply).toBeEnabled();
    expect(card).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(card);
    expect(apply).toBeDisabled();
  });

  it('카드의 「>」는 선택을 바꾸지 않고 상세로 이동한다', async () => {
    renderSelect();

    await userEvent.click(recommendButton());
    await userEvent.click(
      (await screen.findAllByRole('button', { name: '성수동 러닝 모임 상세 보기' }))[0]!,
    );

    expect(router.push).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.recommendation('rec-1'));
    expect(screen.getAllByRole('button', { name: '성수동 러닝 모임' })[0]).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('고른 사진이 없으면 「적용하기」가 바로 추천 사진을 순서대로 고르고 토스트로 알린다', async () => {
    renderSelect();

    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);
    await userEvent.click(screen.getByRole('button', { name: '적용하기' }));

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.applied(6), { fullWidth: true });
    expect(screen.getByRole('status')).toHaveTextContent('6장 선택됨');
    await waitFor(() => expect(screen.queryByRole('button', { name: '적용하기' })).toBeNull());
    // 키보드·스크린 리더 사용자가 적용된 날짜에서 이어 탐색하도록 그 날짜 제목에 포커스
    await waitFor(() => expect(document.activeElement).toHaveTextContent('9월 27일 일요일'));
  });

  it('이미 고른 사진이 있으면 변경 확인을 거치고 「취소」는 시트를 다시 올리며 선택을 유지한다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);
    await userEvent.click(screen.getByRole('button', { name: '적용하기' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('추천 번들 사진으로 변경할까요?')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(await screen.findByRole('button', { name: '적용하기' })).toBeEnabled();
    // 시트가 열려 있는 동안 뒤 화면은 보조 기술에서 가려지므로 숨겨진 요소도 조회
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('1장 선택됨');
    expect(toast).not.toHaveBeenCalled();
  });

  it('「변경하기」는 기존 선택을 풀고 추천 사진만 고른다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);
    await userEvent.click(screen.getByRole('button', { name: '적용하기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '변경하기' }));

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.applied(6), { fullWidth: true });
    expect(screen.getByRole('status')).toHaveTextContent('6장 선택됨');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('멤버 필터가 걸려 있어도 적용하면 「전체」로 되돌려 고른 사진이 가려지지 않게 한다', async () => {
    renderSelect();

    await userEvent.click(screen.getByRole('radio', { name: /^은우/ }));
    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);
    await userEvent.click(screen.getByRole('button', { name: '적용하기' }));

    expect(
      await screen.findByRole('radio', { name: '전체 (6)', checked: true }),
    ).toBeInTheDocument();
  });

  it('추천 사진이 모두 사라졌으면 선택을 지우지 않고 안내만 한다', async () => {
    const vanished: Recommendation = {
      id: 'rec-gone',
      title: '사라진 번들',
      imageSrc: '/gone.jpg',
      memberNames: ['지예'],
      photoIds: ['gone-1', 'gone-2'],
      month: 9,
      day: 27,
    };
    renderSelect([vanished]);

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(recommendButton());
    await userEvent.click(await screen.findByRole('button', { name: '사라진 번들' }));
    await userEvent.click(screen.getByRole('button', { name: '적용하기' }));

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.deletedRecommendation, {
      fullWidth: true,
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('1장 선택됨');
  });

  it('추천 번들이 없으면 제목과 「적용하기」 없이 빈 상태를 보인다', async () => {
    renderSelect([]);

    await userEvent.click(recommendButton());

    expect(await screen.findByText('아직 추천할 번들이 없어요')).toBeInTheDocument();
    expect(screen.getByText('함께한 순간이 쌓이면 번들을 추천해 드릴게요.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '적용하기' })).toBeNull();
  });
});
