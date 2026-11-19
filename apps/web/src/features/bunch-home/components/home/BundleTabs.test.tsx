import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleTabs } from './BundleTabs';

const renderTabs = (bunchId = 'bunch-1') =>
  render(
    <BundleTabs
      bunchId={bunchId}
      completedBundles={[]}
      draftBundles={[]}
      onDeleteDraft={vi.fn()}
    />,
  );

describe('BundleTabs 탭 유지', () => {
  it('고른 탭은 같은 기록 항목으로 돌아와 다시 그려도 유지한다', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTabs();
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    unmount();

    // 작성 중인 번들에 들어갔다가 뒤로 돌아온 경우(같은 기록 항목에서 다시 마운트)
    renderTabs();
    expect(screen.getByRole('tab', { name: '작성 중인 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('다른 번치로 다시 그리면 적어 둔 탭을 쓰지 않고 처음 탭부터 보인다', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTabs('bunch-1');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    unmount();

    renderTabs('bunch-2');
    expect(screen.getByRole('tab', { name: '완성된 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('다른 번치로 전환했다가 돌아오면 앞서 고른 탭이 아니라 처음 탭부터 보인다', async () => {
    const user = userEvent.setup();
    const first = renderTabs('bunch-1');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    first.unmount();
    // 번치 전환: 같은 기록 항목에서 다른 번치로 다시 그림
    renderTabs('bunch-2').unmount();

    renderTabs('bunch-1');
    expect(screen.getByRole('tab', { name: '완성된 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
