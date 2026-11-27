import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tab } from '../tab';
import { TabList } from './TabList';

afterEach(cleanup);

const Example = ({ onValueChange }: { onValueChange?: (_value: string) => void }) => {
  const [value, setValue] = useState('received');
  return (
    <TabList
      aria-label="신고 상태"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    >
      <Tab value="received" count={12}>
        접수
      </Tab>
      <Tab value="done" count={3}>
        조치
      </Tab>
      <Tab value="hidden" disabled>
        숨김
      </Tab>
    </TabList>
  );
};

describe('TabList', () => {
  it('이름이 있는 tablist로 탭을 묶는다', () => {
    render(<Example />);

    expect(screen.getByRole('tablist', { name: '신고 상태' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('탭을 누르면 값을 알리고 선택이 바뀐다', () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('tab', { name: '조치 3' }));

    expect(onValueChange).toHaveBeenCalledWith('done');
    expect(screen.getByRole('tab', { name: '조치 3' }).getAttribute('aria-selected')).toBe('true');
  });

  // Enter·Space 선택은 버튼의 기본 클릭이라 실제 브라우저에서 확인(테스트 DOM은 keydown으로 click을 만들지 않음)
  it('방향키는 초점만 옮기고 선택은 바꾸지 않는다', async () => {
    render(<Example />);
    const first = screen.getByRole('tab', { name: '접수 12' });
    const second = screen.getByRole('tab', { name: '조치 3' });
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });

    await vi.waitFor(() => expect(document.activeElement).toBe(second));
    expect(first.getAttribute('aria-selected')).toBe('true');
  });

  it('선택된 탭만 Tab 키 순서에 들어간다', () => {
    render(<Example />);

    expect(screen.getByRole('tab', { name: '접수 12' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: '조치 3' }).getAttribute('tabindex')).toBe('-1');
  });
});
