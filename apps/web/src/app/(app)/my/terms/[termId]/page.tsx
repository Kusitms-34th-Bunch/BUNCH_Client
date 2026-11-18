import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { TermsDocumentId } from '@/features/auth/constants/terms';
import { TermsDocument } from '@/features/auth/components';
import { TERMS_DOCUMENTS } from '@/features/auth/constants/termsDocuments';
import { MY_PATHS } from '@/features/my/constants/paths';

// MY에서 보는 원문(주소 → 문서). 「privacy」는 가입용 수집 동의서가 아니라 MY 전용 개인정보 처리방침
// 「demographics」는 약관 및 개인정보의 「전문보기」로 여는 추가 개인정보 수집 동의서(가입 때와 같은 문서)
const MY_TERMS_DOCUMENTS = {
  service: 'service',
  privacy: 'privacyPolicy',
  demographics: 'demographics',
} as const satisfies Record<string, TermsDocumentId>;
type MyTermsId = keyof typeof MY_TERMS_DOCUMENTS;

const isMyTermsId = (value: string): value is MyTermsId => Object.hasOwn(MY_TERMS_DOCUMENTS, value);

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(MY_TERMS_DOCUMENTS).map((termId) => ({ termId }));
}

type Params = { params: Promise<{ termId: string }> };

// 내 계정 메뉴 아래 화면이라 검색에서 제외
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { termId } = await params;
  if (!isMyTermsId(termId)) return { robots: { index: false } };
  return { title: TERMS_DOCUMENTS[MY_TERMS_DOCUMENTS[termId]].title, robots: { index: false } };
}

/** MY → 서비스 이용약관·개인정보 처리방침(화면 설계서 MY(4) 1·2번). 헤더에는 뒤로 가기만 */
export default async function MyTermsPage({ params }: Params) {
  const { termId } = await params;
  if (!isMyTermsId(termId)) notFound();

  return (
    <div
      data-ssgoi-transition={MY_PATHS.transitionIds.terms}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <TermsDocument
        documentId={MY_TERMS_DOCUMENTS[termId]}
        hideTitle
        backFallback={MY_PATHS.termsAndPrivacy}
      />
    </div>
  );
}
