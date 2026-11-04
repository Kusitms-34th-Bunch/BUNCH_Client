import { describe, expect, it, vi } from 'vitest';
import MyProfileEditPage, { metadata } from './page';

vi.mock('@/features/my/components', () => ({ ProfileEditScreen: () => null }));

describe('/my/profile page', () => {
  it('전환 경계(data-ssgoi-transition)를 프로필 수정 경로로 지정한다', () => {
    expect(MyProfileEditPage().props).toMatchObject({ 'data-ssgoi-transition': '/my/profile' });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
