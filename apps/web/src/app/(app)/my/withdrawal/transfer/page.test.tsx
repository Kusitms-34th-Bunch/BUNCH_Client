import { describe, expect, it, vi } from 'vitest';
import MyWithdrawalTransferPage, { metadata } from './page';

vi.mock('@/features/my/components', () => ({ AdminTransferScreen: () => null }));

describe('/my/withdrawal/transfer page', () => {
  it('전환 경계(data-ssgoi-transition)를 권한 이전 경로로 지정한다', () => {
    expect(MyWithdrawalTransferPage().props).toMatchObject({
      'data-ssgoi-transition': '/my/withdrawal/transfer',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
