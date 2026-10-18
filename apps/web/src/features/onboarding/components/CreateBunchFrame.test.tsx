import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../constants/paths';
import { useCreateBunchDraft } from '../model/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../model/CreateBunchDraftProvider';
import { CreateBunchFrame } from './CreateBunchFrame';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
let segment: string | null = null;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace }),
  useSelectedLayoutSegment: () => segment,
}));

const Providers = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>
    <OverlayProvider>{children}</OverlayProvider>
  </CreateBunchDraftProvider>
);
const renderFrame = () =>
  render(
    <CreateBunchFrame>
      <p>단계 내용</p>
    </CreateBunchFrame>,
    { wrapper: Providers },
  );
const progress = () => screen.getByRole('progressbar');
const backButton = () => screen.getByRole('button', { name: '뒤로 가기' });

describe('CreateBunchFrame', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
    segment = null;
  });

  it('주소 조각에 따라 3단계 중 몇 단계인지 진행 표시줄에 보여 준다', () => {
    for (const [name, step] of [
      [null, '1'],
      ['description', '2'],
      ['mood', '3'],
    ] as const) {
      segment = name;
      const { unmount } = renderFrame();

      expect(progress().getAttribute('aria-valuenow')).toBe(step);
      expect(progress().getAttribute('aria-valuemax')).toBe('3');
      unmount();
    }
  });

  it('단계가 바뀌어도 진행 표시줄 요소가 그대로 남아 값만 바뀐다', () => {
    const { rerender } = renderFrame();
    const bar = progress();
    const firstSegment = bar.querySelector('span');

    segment = 'description';
    rerender(
      <CreateBunchFrame>
        <p>다른 단계 내용</p>
      </CreateBunchFrame>,
    );

    expect(progress()).toBe(bar);
    expect(bar.querySelector('span')).toBe(firstSegment);
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(screen.getByText('다른 단계 내용')).toBeTruthy();
  });

  it('단계 내용을 헤더와 진행 표시줄 아래에 그린다', () => {
    renderFrame();

    expect(screen.getByText('단계 내용')).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();
  });

  it('헤더의 뒤로 가기는 이동하지 않고 중단 확인 모달을 연다', async () => {
    renderFrame();

    await userEvent.click(backButton());

    expect(
      await screen.findByRole('alertdialog', { name: '번치 만들기를 그만둘까요?' }),
    ).toBeTruthy();
    expect(back).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('계속 만들기와 ESC는 모달만 닫는다', async () => {
    renderFrame();

    await userEvent.click(backButton());
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === '계속 만들기')!,
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    await userEvent.click(backButton());
    await screen.findByRole('alertdialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(replace).not.toHaveBeenCalled();
  });

  it('모달의 나가기는 입력값을 비우고 피드로 이동한다', async () => {
    const Probe = () => {
      const { name, setName, setMood, mood } = useCreateBunchDraft();
      return (
        <>
          <output aria-label="이름">{name}</output>
          <output aria-label="분위기">{mood}</output>
          <button
            onClick={() => {
              setName('퇴근런클럽');
              setMood('mood-4');
            }}
          >
            채우기
          </button>
        </>
      );
    };
    render(
      <>
        <CreateBunchFrame>
          <p>단계 내용</p>
        </CreateBunchFrame>
        <Probe />
      </>,
      { wrapper: Providers },
    );
    await userEvent.click(screen.getByRole('button', { name: '채우기' }));
    expect(screen.getByLabelText('이름').textContent).toBe('퇴근런클럽');

    await userEvent.click(backButton());
    await userEvent.click(await screen.findByRole('button', { name: '나가기' }));

    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed);
    // 피드로 이동해도 같은 OverlayProvider가 남으므로 모달이 직접 닫혀야 함
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByLabelText('이름', { selector: 'output' }).textContent).toBe('');
    expect(screen.getByLabelText('분위기', { selector: 'output' }).textContent).toBe('');
  });
});
