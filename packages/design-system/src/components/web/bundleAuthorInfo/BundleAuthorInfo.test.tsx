import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleAuthorInfo } from './BundleAuthorInfo';

describe('BundleAuthorInfo', () => {
  it('기본: 번치 이름·경과 시간이 한 버튼이고 참여 멤버는 따로 누른다', async () => {
    const onBunchClick = vi.fn();
    const onMembers = vi.fn();
    render(
      <BundleAuthorInfo
        bunchName="여행가조"
        time="2일 전"
        onBunchClick={onBunchClick}
        members={[{ name: '수인' }, { name: '민지' }]}
        onMembers={onMembers}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '여행가조 2일 전' }));
    await userEvent.click(screen.getByRole('button', { name: '참여 멤버 2명' }));
    expect(onBunchClick).toHaveBeenCalledTimes(1);
    expect(onMembers).toHaveBeenCalledTimes(1);
  });

  it('광고: 배지·홍보 문구와 호출자가 넣은 버튼을 보인다', () => {
    render(
      <BundleAuthorInfo
        variant="ad"
        badge="BUNCH SPOT"
        tagline="여기서 뭉쳐봐요!"
        actions={<button type="button">콕하기</button>}
      />,
    );

    expect(screen.getByText('BUNCH SPOT')).toBeTruthy();
    expect(screen.getByText('여기서 뭉쳐봐요!')).toBeTruthy();
    expect(screen.getByRole('button', { name: '콕하기' })).toBeTruthy();
  });
});
