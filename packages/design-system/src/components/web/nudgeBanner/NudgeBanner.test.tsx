import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NudgeBanner } from './NudgeBanner';

afterEach(cleanup);

describe('NudgeBanner', () => {
  it('안내 글자가 버튼의 접근성 이름이고 화살표는 장식이다', () => {
    render(<NudgeBanner>작성 중인 번들을 완성해 보세요!</NudgeBanner>);

    const button = screen.getByRole('button', { name: '작성 중인 번들을 완성해 보세요!' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<NudgeBanner onClick={onClick}>번들 완성하기</NudgeBanner>);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('비활성이면 누를 수 없다', () => {
    const onClick = vi.fn();
    render(
      <NudgeBanner disabled onClick={onClick}>
        번들 완성하기
      </NudgeBanner>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
