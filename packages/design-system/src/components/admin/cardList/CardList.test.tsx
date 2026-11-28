import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CardList } from './CardList';

afterEach(cleanup);

describe('CardList', () => {
  it('본문과 보조 정보를 보여 주고 구분선은 읽지 않는다', () => {
    const { container } = render(
      <CardList
        title="“팔로우 걸고 DM으로 부업 권유해요.”"
        meta={['스팸', '퇴근런클럽 (신고자: 민수)', '10.31 22:15']}
      />,
    );

    expect(screen.getByText('“팔로우 걸고 DM으로 부업 권유해요.”')).toBeTruthy();
    expect(screen.getByText('퇴근런클럽 (신고자: 민수)')).toBeTruthy();
    const dividers = container.querySelectorAll('[aria-hidden="true"]');
    expect(dividers).toHaveLength(2);
  });

  it('보조 정보가 없으면 본문만 보여 준다', () => {
    const { container } = render(<CardList title="본문만" />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('본문만')).toBeTruthy();
  });
});
