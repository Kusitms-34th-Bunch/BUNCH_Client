import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TERMS_DOCUMENT_IDS } from '../../constants/terms';
import { TERMS_DOCUMENTS } from '../../constants/termsDocuments';
import { TermsDocument } from './TermsDocument';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));

describe('TermsDocument', () => {
  it.each(TERMS_DOCUMENT_IDS)('%s 약관은 이름을 화면 제목(h1)으로 보여 준다', (documentId) => {
    render(<TermsDocument documentId={documentId} />);

    expect(
      screen.getByRole('heading', { level: 1, name: TERMS_DOCUMENTS[documentId].title }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it.each(TERMS_DOCUMENT_IDS)(
    '%s 약관은 시행일자·버전과 모든 조항 제목을 보여 준다',
    (documentId) => {
      render(<TermsDocument documentId={documentId} />);
      const { effectiveDate, version, sections } = TERMS_DOCUMENTS[documentId];

      expect(screen.getByText(`시행일자: ${effectiveDate}`)).toBeTruthy();
      expect(screen.getByText(`버전 ${version}`)).toBeTruthy();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(sections.length);
      for (const { title } of sections) {
        expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy();
      }
    },
  );

  it('최종본 버전 1.0(2026. 11. 18 시행)을 보여 준다', () => {
    render(<TermsDocument documentId="service" />);

    expect(screen.getByText('시행일자: 2026. 11. 18')).toBeTruthy();
    expect(screen.getByText('버전 1.0')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: '제 20조 (분쟁 해결과 관할)' }),
    ).toBeTruthy();
  });

  it('항 아래 번호 항목은 순서 있는 목록으로 보여 준다', () => {
    render(<TermsDocument documentId="service" />);
    const article = screen
      .getByRole('heading', { level: 2, name: '제 2조 (용어의 정의)' })
      .closest('section');

    const list = within(article as HTMLElement).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
  });

  it('하위 목록이 있는 항목은 목록 안에 목록을 둔다', () => {
    render(<TermsDocument documentId="privacy" />);
    const parent = screen.getByText('다만 아래 정보는 정해진 기간 동안만 보관하고 파기합니다.');

    const nested = within(parent.closest('li') as HTMLElement).getByRole('list');
    expect(within(nested).getByText('웹 접속 기록: 1시간')).toBeTruthy();
  });

  it('머리말을 첫 조항 앞에 보여 준다', () => {
    render(<TermsDocument documentId="demographics" />);

    expect(screen.getByText(/서비스 개선을 위해 아래 개인정보를 선택적으로/)).toBeTruthy();
  });

  it('처리방침의 국외 이전 업체 이름은 소제목(h3)이고 연락처는 링크다', () => {
    render(<TermsDocument documentId="privacyPolicy" />);

    expect(screen.getByRole('heading', { level: 3, name: '1. PostHog, Inc.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'privacy@posthog.com' })).toHaveAttribute(
      'href',
      'mailto:privacy@posthog.com',
    );
    const web = screen.getByRole('link', { name: 'www.kopico.go.kr' });
    expect(web).toHaveAttribute('href', 'https://www.kopico.go.kr');
    // 쉘이 같은 창 이동을 가로채 바깥 앱으로 열게 새 창으로 열지 않음
    expect(web).not.toHaveAttribute('target');
  });

  it.each(TERMS_DOCUMENT_IDS)('%s 약관의 조항 제목은 문서 안에서 겹치지 않는다', (documentId) => {
    const titles = TERMS_DOCUMENTS[documentId].sections.map(({ title }) => title);

    expect(new Set(titles).size).toBe(titles.length);
  });

  it('헤더에 뒤로 가기 버튼이 있다', () => {
    render(<TermsDocument documentId="service" />);

    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    ).toBeTruthy();
  });
});
