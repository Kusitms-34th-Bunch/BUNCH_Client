import { describe, expect, it, vi } from 'vitest';
import BundleEditPage, { metadata } from './page';

vi.mock('./BundleEditRoute', () => ({ BundleEditRoute: () => null }));

describe('/bunches/[bunchId]/bundles/[bundleId]/edit page', () => {
  it('전환 경계(data-ssgoi-transition)를 번들 수정 id로 지정한다', () => {
    expect(BundleEditPage().props).toMatchObject({
      'data-ssgoi-transition': '/bundles/edit',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
