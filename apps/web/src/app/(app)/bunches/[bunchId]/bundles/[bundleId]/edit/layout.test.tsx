import { describe, expect, it, vi } from 'vitest';
import BundleEditLayout from './layout';

// next의 notFound는 예외를 던져 렌더를 중단함
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));

type Provider = { props: { bunchId: string; bundleId: string } };

const render = async (bunchId: string, bundleId: string) =>
  (await BundleEditLayout({
    children: null,
    params: Promise.resolve({ bunchId, bundleId }),
  })) as unknown as Provider;

describe('/bunches/[bunchId]/bundles/[bundleId]/edit layout', () => {
  it('서버 숫자 id로 바꿀 수 있는 주소는 그대로 provider에 넘긴다', async () => {
    expect((await render('7', '31')).props).toMatchObject({ bunchId: '7', bundleId: '31' });
  });

  it('숫자가 아닌 id는 요청 전에 404로 막는다', async () => {
    await expect(render('7', 'abc')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render('../x', '31')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render('0', '31')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
