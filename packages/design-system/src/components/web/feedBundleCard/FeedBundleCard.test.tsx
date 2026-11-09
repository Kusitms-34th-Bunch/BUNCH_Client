import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FeedBundleCard } from './FeedBundleCard';

describe('FeedBundleCard', () => {
  it('누르는 곳마다 다른 버튼이고 각각 알린다', async () => {
    const handlers = {
      onBunchClick: vi.fn(),
      onMembers: vi.fn(),
      onPhotoClick: vi.fn(),
      onLocationClick: vi.fn(),
      onLike: vi.fn(),
      onComment: vi.fn(),
    };
    render(
      <FeedBundleCard
        bunchName="여행가조"
        time="2일 전"
        members={[{ name: '수인' }]}
        photos={[{ src: 'a.jpg' }, { src: 'b.jpg' }]}
        title="제주 여행"
        location="애월읍"
        date="2026년 7월 9일"
        liked={false}
        likeCount={4}
        commentCount={3}
        {...handlers}
      />,
    );
    const card = screen.getByRole('article', { name: '여행가조의 번들 제주 여행' });
    const user = userEvent.setup();

    await user.click(within(card).getByRole('button', { name: '여행가조 2일 전' }));
    await user.click(within(card).getByRole('button', { name: '참여 멤버 1명' }));
    // 사진이 여러 장이어도 카드에는 대표 사진 한 장
    expect(within(card).getAllByRole('button', { name: /사진 열기$/ })).toHaveLength(1);
    const images = [...card.querySelectorAll('img')].map((image) => image.getAttribute('src'));
    expect(images).toContain('a.jpg');
    expect(images).not.toContain('b.jpg');
    await user.click(within(card).getByRole('button', { name: '제주 여행 사진 열기' }));
    await user.click(within(card).getByRole('button', { name: '위치 애월읍' }));
    await user.click(within(card).getByRole('button', { name: '좋아요 4' }));
    await user.click(within(card).getByRole('button', { name: '댓글 3' }));

    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1);
    expect(handlers.onPhotoClick).toHaveBeenCalledWith(0);
  });

  it('Tab은 화면 순서대로 번치 → 사진 → 위치 → 좋아요로 간다', async () => {
    render(
      <FeedBundleCard
        bunchName="여행가조"
        time="2일 전"
        onBunchClick={() => {}}
        members={[]}
        photos={[{ src: 'a.jpg' }]}
        title="제주 여행"
        location="애월읍"
        onLocationClick={() => {}}
        onPhotoClick={() => {}}
        liked={false}
        likeCount={0}
        onLike={() => {}}
        commentCount={0}
      />,
    );
    const user = userEvent.setup();
    const names: (string | null)[] = [];
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      names.push(
        document.activeElement?.textContent ||
          document.activeElement?.getAttribute('aria-label') ||
          null,
      );
    }
    expect(names).toEqual(['여행가조2일 전', '제주 여행 사진 열기', '위치 애월읍', '좋아요0']);
  });
});
