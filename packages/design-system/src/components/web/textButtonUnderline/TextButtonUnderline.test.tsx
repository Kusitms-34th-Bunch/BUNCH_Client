import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextButtonUnderline } from './TextButtonUnderline';

describe('TextButtonUnderline', () => {
  it('글자를 이름으로 가진 버튼이고 form 안에서 제출하지 않는다', () => {
    render(<TextButtonUnderline>전문보기</TextButtonUnderline>);

    const button = screen.getByRole<HTMLButtonElement>('button', { name: '전문보기' });
    expect(button.type).toBe('button');
    expect(button.classList.contains('underline')).toBe(true);
  });

  it('누르면 onClick을 부르고, 비활성이면 부르지 않는다', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <TextButtonUnderline onClick={onClick}>전문보기</TextButtonUnderline>,
    );

    await userEvent.click(screen.getByRole('button', { name: '전문보기' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <TextButtonUnderline disabled onClick={onClick}>
        전문보기
      </TextButtonUnderline>,
    );
    await userEvent.click(screen.getByRole('button', { name: '전문보기' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
  });

  it('버튼 모드에서도 호출자의 className을 기본 모양에 병합한다', () => {
    render(<TextButtonUnderline className="extra">전문보기</TextButtonUnderline>);

    const button = screen.getByRole('button', { name: '전문보기' });
    expect(button.classList.contains('underline')).toBe(true);
    expect(button.classList.contains('extra')).toBe(true);
  });

  it('renderLink를 주면 링크 요소에 같은 모양을 붙여 그린다', () => {
    render(
      <TextButtonUnderline
        className="extra"
        renderLink={({ className, children }) => (
          <a href="/terms" className={className}>
            {children}
          </a>
        )}
      >
        전문보기
      </TextButtonUnderline>,
    );

    const link = screen.getByRole('link', { name: '전문보기' });
    expect(link.getAttribute('href')).toBe('/terms');
    expect(link.classList.contains('underline')).toBe(true);
    expect(link.classList.contains('extra')).toBe(true);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
