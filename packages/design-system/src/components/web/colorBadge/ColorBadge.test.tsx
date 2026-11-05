import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColorBadge } from './ColorBadge';

describe('ColorBadge', () => {
  it('children을 그린다', () => {
    render(<ColorBadge>뱃지</ColorBadge>);

    expect(screen.getByText('뱃지').tagName).toBe('SPAN');
  });

  it('기본값은 lg·weak·gray다', () => {
    render(<ColorBadge>뱃지</ColorBadge>);
    const badge = screen.getByText('뱃지');

    expect(badge.className).toContain('rounded-r4');
    expect(badge.className).toContain('bg-surface-secondary');
    expect(badge.className).toContain('text-text-tertiary');
  });

  it('weak와 fill은 배경과 글자색이 서로 바뀐다', () => {
    render(
      <>
        <ColorBadge color="orange">weak</ColorBadge>
        <ColorBadge color="orange" variant="fill">
          fill
        </ColorBadge>
      </>,
    );

    expect(screen.getByText('weak').className).toContain('bg-chip-orange-bg');
    expect(screen.getByText('weak').className).toContain('text-chip-orange-fg');
    expect(screen.getByText('fill').className).toContain('bg-chip-orange-fg');
    expect(screen.getByText('fill').className).toContain('text-chip-orange-bg');
  });

  it('brand fill은 surface-brand 배경에 흰 글자다', () => {
    render(
      <ColorBadge color="brand" variant="fill">
        뱃지
      </ColorBadge>,
    );

    expect(screen.getByText('뱃지').className).toContain('bg-surface-brand');
    expect(screen.getByText('뱃지').className).toContain('text-text-inversed');
  });

  it('md는 반경 r3과 12/16 글자를 쓴다', () => {
    render(<ColorBadge size="md">뱃지</ColorBadge>);
    const badge = screen.getByText('뱃지');

    expect(badge.className).toContain('rounded-r3');
    expect(badge.className).toContain('typography-caption-1-regular');
  });

  it('color는 DOM 속성으로 넘어가지 않고 className과 span 속성은 합쳐진다', () => {
    render(
      <ColorBadge color="pink" className="mt-2" data-testid="b">
        뱃지
      </ColorBadge>,
    );
    const badge = screen.getByTestId('b');

    expect(badge.getAttribute('color')).toBeNull();
    expect(badge.className).toContain('mt-2');
  });
});
