import { describe, expect, it, vi } from 'vitest';
import BundleSelectPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleSelect: () => null }));

describe('/bunch/bundles/new page', () => {
  it('전환 경계(data-ssgoi-transition)를 사진 선택 경로로 지정한다', () => {
    expect(BundleSelectPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/bundles/new',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
