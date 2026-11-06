import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MyTermsPage, { generateMetadata, generateStaticParams } from './page';

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ back, replace }),
}));

const params = (termId: string) => ({ params: Promise.resolve({ termId }) });

describe('/my/terms/[termId] page', () => {
  it('서비스 이용약관·개인정보 처리방침만 만든다', () => {
    expect(generateStaticParams()).toEqual([{ termId: 'service' }, { termId: 'privacy' }]);
  });

  it('원문을 보이고 약관 이름은 헤더에 보이지 않는 h1로 둔다', async () => {
    render(await MyTermsPage(params('service')));

    const heading = screen.getByRole('heading', { level: 1, name: '서비스 이용약관' });
    expect(heading).toHaveClass('sr-only');
    expect(screen.getByRole('heading', { level: 2, name: '제 1조 (목적)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeTruthy();
  });

  it('전환 경계를 MY 약관 고정 id로 지정한다', async () => {
    const { container } = render(await MyTermsPage(params('privacy')));

    expect(container.firstElementChild?.getAttribute('data-ssgoi-transition')).toBe('/my/terms');
  });

  it('제목은 약관 이름이고 검색에서 제외한다', async () => {
    expect(await generateMetadata(params('privacy'))).toEqual({
      title: '개인정보 처리방침',
      robots: { index: false },
    });
  });

  it('원문이 없는 약관 주소는 404다', async () => {
    await expect(MyTermsPage(params('age'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('직접 들어와 돌아갈 기록이 없으면 뒤로 가기로 MY에 간다', async () => {
    render(await MyTermsPage(params('service')));

    // 테스트 환경은 기록이 1개(직접 진입)
    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/my');
    expect(back).not.toHaveBeenCalled();
  });
});
