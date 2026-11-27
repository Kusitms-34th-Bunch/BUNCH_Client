import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TabList } from '../tabList';
import { Tab } from './Tab';

afterEach(cleanup);

const renderTabs = (tabs: ReactNode) =>
  render(
    <TabList aria-label="신고 상태" value="received" onValueChange={vi.fn()}>
      {tabs}
    </TabList>,
  );

describe('Tab', () => {
  it('이름과 건수가 탭의 접근성 이름이다', () => {
    renderTabs(
      <Tab value="received" count={12}>
        접수
      </Tab>,
    );

    expect(screen.getByRole('tab', { name: '접수 12' })).toBeTruthy();
  });

  it('건수가 없으면 이름만 보여 준다', () => {
    renderTabs(<Tab value="received">전체</Tab>);

    expect(screen.getByRole('tab', { name: '전체' })).toBeTruthy();
  });

  it('TabList의 값과 같은 탭이 선택된다', () => {
    renderTabs(
      <>
        <Tab value="received">접수</Tab>
        <Tab value="done">조치</Tab>
      </>,
    );

    expect(screen.getByRole('tab', { name: '접수' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: '조치' }).getAttribute('aria-selected')).toBe('false');
  });

  it('비활성 탭은 비활성으로 알리고 눌러도 선택을 알리지 않는다', () => {
    const onValueChange = vi.fn();
    render(
      <TabList aria-label="신고 상태" value="received" onValueChange={onValueChange}>
        <Tab value="received">접수</Tab>
        <Tab value="done" disabled>
          조치
        </Tab>
      </TabList>,
    );

    const tab = screen.getByRole('tab', { name: '조치' });
    fireEvent.click(tab);

    expect(tab.getAttribute('aria-disabled')).toBe('true');
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
