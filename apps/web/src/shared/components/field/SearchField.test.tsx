import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('search landmark 안에 안내 문구가 있는 입력창과 검색 버튼을 그린다', () => {
    render(<SearchField aria-label="게시글 검색" />);

    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: '게시글 검색' }).getAttribute('placeholder')).toBe(
      '글, 제목, 내용을 입력해주세요.',
    );
    expect(screen.getByRole('button', { name: '검색' })).toBeTruthy();
  });

  it('Enter 또는 버튼으로 입력값과 함께 onSearch를 호출한다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchField aria-label="검색어" onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox'), '부산{Enter}');
    expect(onSearch).toHaveBeenLastCalledWith('부산');

    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith('부산');
  });

  it('검색 버튼 이름을 바꿀 수 있다', () => {
    render(<SearchField aria-label="검색어" searchLabel="검색 실행" />);

    expect(screen.getByRole('button', { name: '검색 실행' })).toBeTruthy();
  });
});

describe('SearchField disabled', () => {
  it('disabled면 입력창과 검색 버튼이 모두 비활성이고 onSearch를 호출하지 않는다', async () => {
    const onSearch = vi.fn();
    render(<SearchField disabled onSearch={onSearch} />);

    expect(screen.getByRole('searchbox', { name: '검색어' }).hasAttribute('disabled')).toBe(true);
    const button = screen.getByRole('button', { name: '검색' });
    expect(button.hasAttribute('disabled')).toBe(true);
    await userEvent.click(button);
    expect(onSearch).not.toHaveBeenCalled();
  });
});
