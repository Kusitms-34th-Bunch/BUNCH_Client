import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LineDownloadMediumIcon } from '../../../icons';
import { MenuItem } from './MenuItem';

describe('MenuItem', () => {
  it('menuitem 버튼이고 tabIndex가 -1이다', () => {
    render(<MenuItem>저장</MenuItem>);
    const item = screen.getByRole('menuitem', { name: '저장' });
    expect(item.tagName).toBe('BUTTON');
    expect(item.getAttribute('type')).toBe('button');
    expect((item as HTMLButtonElement).tabIndex).toBe(-1);
  });

  it('클릭하면 onClick을 호출한다', () => {
    const onClick = vi.fn();
    render(<MenuItem onClick={onClick}>저장</MenuItem>);
    fireEvent.click(screen.getByRole('menuitem'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('default는 text-secondary, warning은 system-fail-text', () => {
    render(
      <>
        <MenuItem>저장</MenuItem>
        <MenuItem tone="warning">삭제</MenuItem>
      </>,
    );
    expect(screen.getByRole('menuitem', { name: '저장' }).className).toContain(
      'text-text-secondary',
    );
    expect(screen.getByRole('menuitem', { name: '삭제' }).className).toContain(
      'text-system-fail-text',
    );
  });

  it('누름 오버레이는 overlay-hover 75ms', () => {
    render(<MenuItem>저장</MenuItem>);
    const cls = screen.getByRole('menuitem').className;
    expect(cls).toContain('before:bg-overlay-hover');
    expect(cls).toContain('before:duration-75');
    expect(cls).toContain('active:before:opacity-100');
  });

  it('icon을 글자 앞에 그리고 이름에는 글자만 쓴다', () => {
    render(<MenuItem icon={<LineDownloadMediumIcon aria-hidden="true" />}>저장</MenuItem>);
    const item = screen.getByRole('menuitem', { name: '저장' });
    expect(item.firstElementChild?.querySelector('svg')).toBeTruthy();
  });

  it('icon이 없으면 글자만 그린다', () => {
    render(<MenuItem>저장</MenuItem>);
    expect(screen.getByRole('menuitem').querySelector('svg')).toBeNull();
  });
});

describe('MenuItem 접근성', () => {
  it('높이 44px 이상이고 아이콘 래퍼는 aria-hidden이다', () => {
    render(<MenuItem icon={<LineDownloadMediumIcon aria-label="다운로드" />}>저장</MenuItem>);
    const item = screen.getByRole('menuitem', { name: '저장' });
    expect(item.className).toContain('min-h-11');
    expect(item.className).toContain('focus-visible:outline-2');
    expect(item.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
