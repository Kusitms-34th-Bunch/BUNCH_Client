import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchPage from './page';

vi.mock('@/features/main-navigation/components', () => ({
  MainTabPage: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./BunchHomeRoute', () => ({
  BunchHomeRoute: ({ initialTab }: { initialTab: string }) => (
    <div data-testid="bunch-home">{initialTab}</div>
  ),
}));

describe('/bunch page', () => {
  it.each([
    [{ tab: 'drafts' }, 'draft'],
    [{ tab: 'following' }, 'completed'],
    [{}, 'completed'],
  ])('주소 %o면 처음 번들 탭은 %s다(5.12.2)', async (searchParams, tab) => {
    render(await BunchPage({ searchParams: Promise.resolve(searchParams) }));

    expect(screen.getByTestId('bunch-home')).toHaveTextContent(tab);
  });
});
