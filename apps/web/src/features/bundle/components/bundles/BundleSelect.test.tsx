import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recommendation } from '../../lib/recommendation';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { BundleSelectProvider } from '../../contexts/BundleSelectProvider';
import { BundleSelect } from './BundleSelect';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/features/photo-box/hooks/usePhotoBox', async () => ({
  usePhotoBox: (await import('../../testing/selectScreenDoubles')).usePhotoBoxDouble,
}));
vi.mock('../../hooks/useCreateBundle', async () => ({
  useCreateBundle: (await import('../../testing/selectScreenDoubles')).useCreateBundleDouble,
}));
vi.mock('../../fixtures/recommendation.fixture', async () => ({
  recommendationFixture: (await import('../../testing/selectScreenDoubles'))
    .legacyRecommendationFixture,
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 앞 단계(멤버 선택)에서 경진·수인을 고른 상태로 시작(사진함 샘플의 나는 은우)
const renderSelect = (
  recommendations?: readonly Recommendation[],
  initialMemberIds: readonly string[] = ['gyeongjin', 'suin'],
) =>
  render(
    <BundleSelectProvider recommendations={recommendations} initialMemberIds={initialMemberIds}>
      <BundleSelect currentYear={2026} />
    </BundleSelectProvider>,
  );

const createButton = () => screen.getByRole('button', { name: '다음' });
const recommendButton = () => screen.getByRole('button', { name: '추천 번들 보기' });
// 사진함 샘플의 9월 27일 섹션: 고를 수 있는 사진 5장(처리 중 1장은 회색 자리표시)
const sectionPhotos = () =>
  within(screen.getByRole('region', { name: '9월 27일 일요일' })).getAllByRole('button');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

const CREATE_DELAY_MS = 10_000;

describe('사진 고르기', () => {
  it('처음에는 고른 사진이 없어 「다음」이 비활성이고 「추천 번들 보기」는 켜져 있다', () => {
    renderSelect();

    expect(createButton()).toBeDisabled();
    expect(recommendButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('선택한 사진이 없어요.');
  });

  it('고른 순서대로 번호가 붙고 칩에 선택 개수가 보이며 「다음」이 켜진다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(sectionPhotos()[1]!);

    expect(createButton()).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('2장 선택됨');
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeInTheDocument();
    expect(sectionPhotos()[0]).toHaveTextContent('1');
    expect(sectionPhotos()[1]).toHaveTextContent('2');
  });

  it('고른 사진을 다시 누르면 해제되고 모두 해제하면 「다음」이 다시 꺼진다', async () => {
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

  it('「다음」을 누르면 생성 중으로 알리고 헤더·하단을 막은 뒤 작성 화면으로 이동한다', async () => {
    // 대기를 10초로 두고 직접 넘김: 느린 CI에서 클릭·확인 사이에 대기(예전 50ms)가 먼저 끝나 이동하던 문제 방지
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSelect();

    await user.click(sectionPhotos()[0]!);
    await user.click(createButton());

    expect(screen.getByRole('status')).toHaveTextContent(BUNDLE_SELECT_MESSAGES.creating);
    expect(
      screen.getByRole('button', { name: '뒤로 가기', hidden: true }).closest('[inert]'),
    ).not.toBeNull();
    expect(createButton().closest('[inert]')).not.toBeNull();
    expect(router.push).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(CREATE_DELAY_MS));
    expect(router.push).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.draft('draft-1'));
  });

  it('멤버 칩은 「전체」와 앞 단계에서 고른 멤버, 나만 보인다', () => {
    renderSelect();

    const chips = screen.getAllByRole('radio').map((chip) => chip.textContent);
    expect(chips).toEqual(['전체', '은우', '경진', '수인']);
  });

  it('멤버를 고르지 않고 들어오면 멤버 선택으로 되돌려 보낸다', () => {
    renderSelect(undefined, []);

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.members);
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('「이전」은 멤버 선택으로 돌아간다(기록이 없으면 그 위치로 이동)', async () => {
    renderSelect();

    await userEvent.click(screen.getByRole('button', { name: '이전' }));

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.members);
  });

  it('돌아갈 기록이 없으면 뒤로 가기가 번치 홈으로 이동한다', async () => {
    renderSelect();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.bunchHome);
  });
});

describe('추천 번들 시트', () => {
  it('시트에는 「적용하기」 버튼이 없고 카드를 고르기 전에는 아무것도 선택되지 않는다', async () => {
    renderSelect();

    await userEvent.click(recommendButton());
    const card = (await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!;

    expect(screen.queryByRole('button', { name: '적용하기' })).toBeNull();
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('선택한 사진이 없어요.');
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

  it('고른 사진이 없으면 카드를 누르는 것만으로 추천 사진을 순서대로 고르고 토스트로 알린다', async () => {
    renderSelect();

    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.applied(6), { fullWidth: true });
    expect(screen.getByRole('status')).toHaveTextContent('6장 선택됨');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // 키보드·스크린 리더 사용자가 적용된 날짜에서 이어 탐색하도록 그 날짜 제목에 포커스
    await waitFor(() => expect(document.activeElement).toHaveTextContent('9월 27일 일요일'));
  });

  it('이미 고른 사진이 있으면 변경 확인을 거치고 「취소」는 시트를 다시 올리며 선택을 유지한다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('추천 번들 사진으로 변경할까요?')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    // 취소하면 시트가 다시 올라와 누른 카드가 선택된 모양으로 보임
    expect((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // 시트가 열려 있는 동안 뒤 화면은 보조 기술에서 가려지므로 숨겨진 요소도 조회
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('1장 선택됨');
    expect(toast).not.toHaveBeenCalled();
  });

  it('「변경하기」는 기존 선택을 풀고 추천 사진만 고른다', async () => {
    renderSelect();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(recommendButton());
    await userEvent.click((await screen.findAllByRole('button', { name: '성수동 러닝 모임' }))[0]!);
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

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.deletedRecommendation, {
      fullWidth: true,
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('1장 선택됨');
  });

  it('추천 번들이 없으면 제목 없이 빈 상태를 보인다', async () => {
    renderSelect([]);

    await userEvent.click(recommendButton());

    expect(await screen.findByText('아직 추천할 번들이 없어요')).toBeInTheDocument();
    expect(screen.getByText('함께한 순간이 쌓이면 번들을 추천해 드릴게요.')).toBeInTheDocument();
  });
});
