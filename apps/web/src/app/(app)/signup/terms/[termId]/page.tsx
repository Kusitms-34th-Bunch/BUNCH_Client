import { notFound } from 'next/navigation';
import { TermsDocument } from '@/features/auth/components';
import { isTermsDocumentId, TERMS_DOCUMENT_IDS } from '@/features/auth/constants/terms';

// 원문이 있는 약관만 정적으로 만들고 그 밖의 주소는 404
export const dynamicParams = false;

export function generateStaticParams() {
  return TERMS_DOCUMENT_IDS.map((termId) => ({ termId }));
}

export default async function SignupTermsDocumentPage({
  params,
}: {
  params: Promise<{ termId: string }>;
}) {
  const { termId } = await params;
  if (!isTermsDocumentId(termId)) notFound();

  return <TermsDocument documentId={termId} />;
}
