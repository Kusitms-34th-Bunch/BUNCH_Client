import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../../contexts/CreateBunchDraftProvider';
import { BunchCreated } from './BunchCreated';

const gallery = vi.hoisted(() => vi.fn());
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  galleryBridge: {
    isReactNativeWebView: true,
    isNativeMethodAvailable: () => true,
    pickGalleryImage: gallery,
  },
}));

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));

// 1~3단계를 모두 마친 상태(가드를 통과)
const AfterMood = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider
    initial={{
      name: '퇴근런클럽',
      visibility: 'public',
      description: '퇴근 후 달리는 모임',
      mood: 'mood-1',
    }}
  >
    {children}
  </CreateBunchDraftProvider>
);
const Empty = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>{children}</CreateBunchDraftProvider>
);
const DraftName = () => <output aria-label="draft 이름">{useCreateBunchDraft().name}</output>;

describe('BunchCreated', () => {
  it('사진 변경 버튼이 갤러리와 연결되고 재선택 취소 후에도 임시 미리보기 안내를 유지한다', async () => {
    const dataUrl = 'data:image/jpeg;base64,YWJj';
    gallery.mockResolvedValueOnce({ dataUrl }).mockResolvedValueOnce(null);
    render(<BunchCreated />, { wrapper: AfterMood });
    await userEvent.click(screen.getByRole('button', { name: '사진 변경' }));
    await waitFor(() =>
      expect(screen.getByAltText('선택한 번치 대표 사진').getAttribute('src')).toBe(dataUrl),
    );
    await userEvent.click(screen.getByRole('button', { name: '사진 변경' }));
    await waitFor(() => expect(gallery).toHaveBeenCalledTimes(2));
    expect(screen.getByText('현재 화면에서만 미리 볼 수 있어요.')).toBeTruthy();
    expect(screen.getByAltText('선택한 번치 대표 사진').getAttribute('src')).toBe(dataUrl);
  });

  beforeEach(() => {
    gallery.mockReset();
    replace.mockClear();
    push.mockClear();
  });

  it('입력한 번치 이름과 완료 문구를 제목으로 보여 준다', () => {
    render(<BunchCreated />, { wrapper: AfterMood });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('퇴근런클럽 번치가 만들어졌어요!');
    expect(heading.querySelectorAll('span')).toHaveLength(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('보여 준 뒤 draft를 비워 뒤로 가기로 돌아가도 다시 만들 수 없다', () => {
    render(
      <>
        <BunchCreated />
        <DraftName />
      </>,
      { wrapper: AfterMood },
    );

    expect(screen.getByLabelText('draft 이름').textContent).toBe('');
    // draft 초기화 후 제목과 가드 판정 유지 확인
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('퇴근런클럽');
    expect(replace).not.toHaveBeenCalled();
  });

  it('멤버 초대하기 카드와 내 번치로 이동하기 버튼과 사진 변경 버튼이 있다', () => {
    render(<BunchCreated />, { wrapper: AfterMood });

    expect(screen.getByRole('button', { name: /멤버 초대하기/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: '내 번치로 이동하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '사진 변경' })).toBeTruthy();
  });

  it('단계를 거치지 않고 직접 들어오면 화면을 그리지 않고 1단계로 되돌린다', () => {
    render(<BunchCreated />, { wrapper: Empty });

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
  });

  it('멤버 초대하기는 초대 화면으로 이동한다', async () => {
    render(<BunchCreated />, { wrapper: AfterMood });

    await userEvent.click(screen.getByRole('button', { name: /멤버 초대하기/ }));

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchInvite);
  });

  it('내 번치로 이동하기는 피드로 replace한다', async () => {
    render(<BunchCreated />, { wrapper: AfterMood });

    await userEvent.click(screen.getByRole('button', { name: '내 번치로 이동하기' }));

    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed);
  });

  it('초대 화면에서 뒤로 가서 다시 들어와도 같은 완료 화면을 보여 준다', async () => {
    const Toggle = () => {
      const [shown, setShown] = useState(true);
      return (
        <>
          <button onClick={() => setShown((value) => !value)}>화면 전환</button>
          {shown ? <BunchCreated /> : null}
        </>
      );
    };
    render(<Toggle />, { wrapper: AfterMood });

    await userEvent.click(screen.getByRole('button', { name: '화면 전환' }));
    await userEvent.click(screen.getByRole('button', { name: '화면 전환' }));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      '퇴근런클럽 번치가 만들어졌어요!',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('마친 뒤 새로 입력하기 시작하면 이전 완료 기록을 버린다', async () => {
    const Probe = () => {
      const { createdName, setName } = useCreateBunchDraft();
      return (
        <>
          <button onClick={() => setName('새이름')}>입력 시작</button>
          <output aria-label="완료 기록">{createdName ?? '없음'}</output>
        </>
      );
    };
    // 완료 화면 없이 입력 화면만 있는 상태(뒤로 가서 1단계에 있는 경우)
    render(<Probe />, {
      wrapper: ({ children }) => (
        <CreateBunchDraftProvider initial={{ createdName: '퇴근런클럽' }}>
          {children}
        </CreateBunchDraftProvider>
      ),
    });
    expect(screen.getByLabelText('완료 기록').textContent).toBe('퇴근런클럽');

    await userEvent.click(screen.getByRole('button', { name: '입력 시작' }));

    expect(screen.getByLabelText('완료 기록').textContent).toBe('없음');
  });
});
