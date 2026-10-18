import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { joinInvitationFixture } from '../../fixtures/join.fixture';
import { BunchJoined } from './BunchJoined';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const renderJoined = () =>
  render(
    <BunchJoined
      bunchName={joinInvitationFixture.bunchName}
      imageSrc={joinInvitationFixture.imageSrc}
    />,
  );

describe('BunchJoined', () => {
  beforeEach(() => replace.mockClear());

  it('번치 이름이 들어간 완료 문구와 안내를 제목·본문으로 보여 준다', () => {
    renderJoined();

    expect(screen.getByRole('heading', { level: 1, name: '여행가조에 합류했어요!' })).toBeTruthy();
    expect(screen.getByText('이제 함께한 순간을 같이 기록할 수 있어요.')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('대표 이미지는 장식이라 대체 텍스트가 없다', () => {
    const { container } = renderJoined();

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
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
