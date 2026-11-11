import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatedBunch } from '../../api/bunches';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { JoinInvitationProvider } from '../../contexts/JoinInvitationProvider';
import { BunchJoined } from './BunchJoined';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const BUNCH: CreatedBunch = { id: '3', name: '여행가조', characterType: 'TYPE_3' };
const withBunch = (joinedBunch: CreatedBunch | null) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <JoinInvitationProvider {...(joinedBunch ? { initial: { joinedBunch } } : {})}>
        {children}
      </JoinInvitationProvider>
    );
  };
const renderJoined = (joinedBunch: CreatedBunch | null = BUNCH) =>
  render(<BunchJoined />, { wrapper: withBunch(joinedBunch) });

describe('BunchJoined', () => {
  beforeEach(() => replace.mockClear());

  it('서버가 돌려준 번치 이름이 들어간 완료 문구와 안내를 제목·본문으로 보여 준다', () => {
    renderJoined();

    expect(screen.getByRole('heading', { level: 1, name: '여행가조에 합류했어요!' })).toBeTruthy();
    expect(screen.getByText('이제 함께한 순간을 같이 기록할 수 있어요.')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('대표 사진이 없으면 번치 성격의 기본 이미지를, 있으면 그 사진을 보여 준다', () => {
    const { container, unmount } = renderJoined();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/images/default-bunch/type-3.svg',
    );
    unmount();

    const { container: withPhoto } = renderJoined({
      ...BUNCH,
      imageUrl: 'https://cdn.example.com/bunch.jpg',
    });
    expect(withPhoto.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/bunch.jpg',
    );
  });

  it('대표 이미지는 장식이라 대체 텍스트가 없다', () => {
    const { container } = renderJoined();

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('참여한 번치 없이 직접 들어오면 화면을 그리지 않고 링크 입력으로 되돌린다', () => {
    renderJoined(null);

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunch);
  });

  it('닫기와 번치로 이동하기는 피드로 replace한다', async () => {
    renderJoined();

    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    await userEvent.click(screen.getByRole('button', { name: '번치로 이동하기' }));

    expect(replace).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenNthCalledWith(1, ONBOARDING_PATHS.feed);
    expect(replace).toHaveBeenNthCalledWith(2, ONBOARDING_PATHS.feed);
  });
});
