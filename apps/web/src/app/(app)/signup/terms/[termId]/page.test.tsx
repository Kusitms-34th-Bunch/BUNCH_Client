import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SignupTermsDocumentPage, { generateStaticParams } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}));

const params = (termId: string) => ({ params: Promise.resolve({ termId }) });

describe('/signup/terms/[termId] page', () => {
  it('로그인·회원가입 원문 3개만 만든다', () => {
    expect(generateStaticParams()).toEqual([
      { termId: 'service' },
      { termId: 'privacy' },
      { termId: 'demographics' },
    ]);
  });

  it('개인정보 원문은 가입용 수집 동의서다', async () => {
    render(await SignupTermsDocumentPage(params('privacy')));

    expect(
      screen.getByRole('heading', { level: 1, name: '개인정보 수집 및 이용 동의' }),
    ).toBeTruthy();
  });

  it('MY 전용 개인정보 처리방침은 가입 화면에서 열 수 없다', async () => {
    await expect(SignupTermsDocumentPage(params('privacyPolicy'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
