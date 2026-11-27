import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';

afterEach(cleanup);

describe('SearchBar', () => {
  it('접근성 이름이 있는 검색 입력창이다', () => {
    render(<SearchBar aria-label="장소명 검색" placeholder="장소명을 검색해주세요." />);

    const input = screen.getByRole('searchbox', { name: '장소명 검색' });
    expect(input.getAttribute('placeholder')).toBe('장소명을 검색해주세요.');
  });

  it('입력하면 onChange를 부른다', () => {
    const onChange = vi.fn();
    render(<SearchBar aria-label="장소명 검색" onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '플로디' } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('비활성이면 입력할 수 없다', () => {
    render(<SearchBar aria-label="장소명 검색" disabled />);

    expect(screen.getByRole('searchbox').hasAttribute('disabled')).toBe(true);
  });

  it('포커스 윤곽은 Tab으로 들어왔을 때만 켜고 눌러서 들어오면 켜지 않는다', async () => {
    render(
      <>
        <button type="button">앞</button>
        <SearchBar aria-label="장소명 검색" />
      </>,
    );
    const user = userEvent.setup();
    const input = screen.getByRole('searchbox', { name: '장소명 검색' });
    const box = input.parentElement;

    await user.click(input);
    expect(box?.hasAttribute('data-focus-keyboard')).toBe(false);

    await user.click(screen.getByRole('button', { name: '앞' }));
    await user.tab();
    expect(document.activeElement).toBe(input);
    expect(box?.hasAttribute('data-focus-keyboard')).toBe(true);

    await user.tab();
    expect(box?.hasAttribute('data-focus-keyboard')).toBe(false);
  });
});
