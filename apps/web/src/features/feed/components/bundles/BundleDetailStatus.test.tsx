import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { getPageLoadingCount } from '@/shared/lib/navigation/pageLoadingState';
import type { FeedBundle } from '../../lib/types';
import { BundleDetailStatus } from './BundleDetailStatus';

const bundle: FeedBundle = {
  id: '7',
  bunch: { id: '1', name: '우리 번치' },
  publishedAt: '2026-11-20T00:00:00Z',
  title: '가을 소풍',
  places: [],
  photos: [{ src: '/a.jpg', alt: '첫 사진' }],
  members: [],
  liked: false,
  likeCount: 0,
  commentCount: 0,
};

describe('BundleDetailStatus 받는 중', () => {
  it('피드 카드 데이터가 있으면 덮개 없이 제목·첫 사진을 먼저 그리고 누를 수 없게 막는다', () => {
    const { container } = render(
      <BundleDetailStatus
        kind="loading"
        titleRef={createRef()}
        onRetry={() => {}}
        preview={{ bundle, partial: false, time: '방금' }}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('번들을 불러오는 중이에요');
    expect(container.querySelector('[inert]')?.textContent).toContain('가을 소풍');
    expect(container.querySelector('img[src="/a.jpg"]')).not.toBeNull();
    expect(getPageLoadingCount()).toBe(0);
    // 사진 아래(한마디·좋아요·댓글)는 스켈레톤
    expect(container.querySelectorAll('[inert] ~ [aria-hidden="true"]')).toHaveLength(1);
  });

  it('가진 데이터 없이 들어오면 덮개 없이 본문 전체 스켈레톤과 받는 중 안내를 보인다', () => {
    const { container } = render(
      <BundleDetailStatus kind="loading" titleRef={createRef()} onRetry={() => {}} />,
    );
    expect(screen.getByRole('status').textContent).toBe('번들을 불러오는 중이에요');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(getPageLoadingCount()).toBe(0);
  });

  it('격자 칸으로 열었으면(부분 데이터) 번치·제목·표지를 그리고 날짜 줄은 자리표시로 둔다', () => {
    const { container } = render(
      <BundleDetailStatus
        kind="loading"
        titleRef={createRef()}
        onRetry={() => {}}
        preview={{ bundle, partial: true, time: '' }}
      />,
    );
    expect(container.querySelector('[inert]')?.textContent).toContain('가을 소풍');
    expect(container.querySelector('img[src="/a.jpg"]')).not.toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"] .h-4.w-32')).toHaveLength(1);
  });
});
