import { describe, expect, it, vi } from 'vitest';
import MyWithdrawalPage, { metadata } from './page';

vi.mock('@/features/my/components', () => ({ WithdrawalScreen: () => null }));

describe('/my/withdrawal page', () => {
  it('전환 경계(data-ssgoi-transition)를 회원 탈퇴 경로로 지정한다', () => {
    expect(MyWithdrawalPage().props).toMatchObject({ 'data-ssgoi-transition': '/my/withdrawal' });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
