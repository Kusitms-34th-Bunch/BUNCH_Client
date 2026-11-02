import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FeedPage from './page';

describe('/feed page', () => {
  it('피드 화면이 생기기 전까지 다른 번치 프로필로 가는 임시 입구(공개·비공개)를 둔다', () => {
    render(<FeedPage />);

    expect(screen.getByRole('link', { name: '공개 번치 보기(캠핑러버)' })).toHaveAttribute(
      'href',
      '/bunches/bunch-camping',
    );
    expect(screen.getByRole('link', { name: '비공개 번치 보기(책방산책)' })).toHaveAttribute(
      'href',
      '/bunches/bunch-book',
    );
  });
});
