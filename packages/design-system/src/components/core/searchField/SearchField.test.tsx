import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('search landmark 안에 안내 문구가 있는 입력창을 그리고 검색 아이콘은 장식이다', () => {
    const { container } = render(<SearchField aria-label="게시글 검색" />);

    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: '게시글 검색' }).getAttribute('placeholder')).toBe(
      '글, 제목, 내용을 입력해주세요.',
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('Enter로 입력값과 함께 onSearch를 호출한다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchField aria-label="검색어" onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox'), '부산{Enter}');
    expect(onSearch).toHaveBeenLastCalledWith('부산');
  });
});

describe('SearchField disabled', () => {
  it('disabled면 입력창이 비활성이다', () => {
    render(<SearchField disabled />);

    expect(screen.getByRole('searchbox', { name: '검색어' }).hasAttribute('disabled')).toBe(true);
  });
});
