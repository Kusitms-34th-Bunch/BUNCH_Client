import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type * as UseBunchHomeModule from '../../hooks/useBunchHome';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BunchHome } from './BunchHome';

const wrapper = createQueryWrapper(createTestQueryClient());

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// 지금 번치에 멤버가 나 혼자인 경우: 샘플 번치의 멤버 수만 바꿈
let memberCount = 1;
vi.mock('../../hooks/useBunchHome', async (importOriginal) => {
  const actual = await importOriginal<typeof UseBunchHomeModule>();
  return {
    useBunchHome: () => {
      const real = actual.useBunchHome();
      return {
        ...real,
        data: real.data && { ...real.data, current: { ...real.data.current, memberCount } },
      };
    },
  };
});

beforeEach(() => {
  sessionStorage.clear();
  push.mockClear();
  memberCount = 1;
});

describe('BunchHome 번들 만들기 진입', () => {
  it('번치에 멤버가 나 혼자면 「+」가 번들 만들기로 가지 않고 멤버 초대를 안내한다', async () => {
    render(<BunchHome source="sample" />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));

    const dialog = await screen.findByRole('alertdialog', { name: '함께할 멤버가 없어요' });
    expect(dialog).toHaveAccessibleDescription(
      '번들은 번치의 멤버가 2명 이상일 때 만들 수 있어요.',
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('「초대하기」는 멤버 초대 화면으로 이동한다', async () => {
    render(<BunchHome source="sample" />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '초대하기' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.invite);
  });

  it('「취소」는 창만 닫고 이동하지 않는다', async () => {
    render(<BunchHome source="sample" />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(push).not.toHaveBeenCalled();
  });

  it('멤버가 2명 이상이면 바로 번들 만들기(멤버 선택)로 이동한다', async () => {
    memberCount = 2;
    render(<BunchHome source="sample" />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.createBundle);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
