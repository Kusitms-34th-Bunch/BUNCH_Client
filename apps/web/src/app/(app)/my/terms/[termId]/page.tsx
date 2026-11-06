import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TermsDocument } from '@/features/auth/components';
import { isTermsDocumentId, TERMS_DOCUMENT_IDS } from '@/features/auth/constants/terms';
import { TERMS_DOCUMENTS } from '@/features/auth/constants/termsDocuments';
import { MY_PATHS } from '@/features/my/constants/paths';

// 원문이 있는 약관만 정적으로 만들고 그 밖의 주소는 404
export const dynamicParams = false;

export function generateStaticParams() {
  return TERMS_DOCUMENT_IDS.map((termId) => ({ termId }));
}

type Params = { params: Promise<{ termId: string }> };

// 내 계정 메뉴 아래 화면이라 검색에서 제외(같은 원문은 가입 약관에도 있음)
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { termId } = await params;
  const title = isTermsDocumentId(termId) ? TERMS_DOCUMENTS[termId].title : undefined;
  return { ...(title ? { title } : {}), robots: { index: false } };
}

/** MY → 서비스 이용약관·개인정보 처리방침(화면 설계서 MY(4) 1·2번). 원문은 가입 약관과 같고 헤더에는 뒤로 가기만 */
export default async function MyTermsPage({ params }: Params) {
  const { termId } = await params;
  if (!isTermsDocumentId(termId)) notFound();

  return (
    <div
      data-ssgoi-transition={MY_PATHS.transitionIds.terms}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <TermsDocument documentId={termId} hideTitle backFallback={MY_PATHS.home} />
    </div>
  );
}
