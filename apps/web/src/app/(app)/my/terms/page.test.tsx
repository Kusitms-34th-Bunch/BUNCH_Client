import { describe, expect, it, vi } from 'vitest';
import MyTermsAndPrivacyPage, { metadata } from './page';

vi.mock('@/features/my/components', () => ({ TermsAndPrivacyRoute: () => null }));

describe('/my/terms page', () => {
  it('전환 경계(data-ssgoi-transition)를 약관 및 개인정보 경로로 지정한다', () => {
    expect(MyTermsAndPrivacyPage().props).toMatchObject({
      'data-ssgoi-transition': '/my/terms',
    });
  });

  it('제목은 약관 및 개인정보이고 검색에서 제외한다', () => {
    expect(metadata).toMatchObject({ title: '약관 및 개인정보', robots: { index: false } });
  });
});
