import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { TermsDocumentId } from '@/features/auth/constants/terms';
import { TermsDocument } from '@/features/auth/components';
import { TERMS_DOCUMENTS } from '@/features/auth/constants/termsDocuments';
import { MY_PATHS } from '@/features/my/constants/paths';

// MY에서 보는 약관(서비스 이용약관·개인정보 처리방침)만 정적으로 만들고 그 밖의 주소(선택 약관 포함)는 404
const MY_TERMS_IDS: readonly TermsDocumentId[] = ['service', 'privacy'];
const isMyTermsId = (value: string): value is TermsDocumentId =>
  (MY_TERMS_IDS as readonly string[]).includes(value);

export const dynamicParams = false;

export function generateStaticParams() {
  return MY_TERMS_IDS.map((termId) => ({ termId }));
}

type Params = { params: Promise<{ termId: string }> };

// 내 계정 메뉴 아래 화면이라 검색에서 제외(같은 원문은 가입 약관에도 있음)
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { termId } = await params;
  const title = isMyTermsId(termId) ? TERMS_DOCUMENTS[termId].title : undefined;
  return { ...(title ? { title } : {}), robots: { index: false } };
}

/** MY → 서비스 이용약관·개인정보 처리방침(화면 설계서 MY(4) 1·2번). 원문은 가입 약관과 같고 헤더에는 뒤로 가기만 */
export default async function MyTermsPage({ params }: Params) {
  const { termId } = await params;
  if (!isMyTermsId(termId)) notFound();

  return (
    <div
      data-ssgoi-transition={MY_PATHS.transitionIds.terms}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <TermsDocument documentId={termId} hideTitle backFallback={MY_PATHS.home} />
    </div>
  );
}
