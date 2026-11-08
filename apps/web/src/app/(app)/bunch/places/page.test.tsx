import { describe, expect, it, vi } from 'vitest';
import BunchPlacesPage, { metadata } from './page';

vi.mock('@/features/bunch-places/components', () => ({ BunchPlaces: () => null }));

describe('/bunch/places page', () => {
  it('전환 경계(data-ssgoi-transition)를 콕한 장소 경로로 지정한다', () => {
    expect(BunchPlacesPage().props).toMatchObject({ 'data-ssgoi-transition': '/bunch/places' });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
