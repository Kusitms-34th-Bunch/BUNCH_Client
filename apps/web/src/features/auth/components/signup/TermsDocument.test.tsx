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

  it.each(TERMS_DOCUMENT_IDS)('%s 약관은 시행일자·버전과 조항 4개를 보여 준다', (documentId) => {
    render(<TermsDocument documentId={documentId} />);
    const { effectiveDate, version, articles } = TERMS_DOCUMENTS[documentId];

    expect(screen.getByText(`시행일자: ${effectiveDate}`)).toBeTruthy();
    expect(screen.getByText(`버전 ${version}`)).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    for (const { title } of articles) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy();
    }
  });

  it.each(TERMS_DOCUMENT_IDS)(
    '%s 약관의 번호 항목은 순서 있는 목록으로 보여 준다',
    (documentId) => {
      render(<TermsDocument documentId={documentId} />);

      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    },
  );

  it('헤더에 뒤로 가기 버튼이 있다', () => {
    render(<TermsDocument documentId="service" />);

    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    ).toBeTruthy();
  });
});
