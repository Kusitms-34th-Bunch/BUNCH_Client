import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { TermsDocumentId } from '@/features/auth/constants/terms';
import { TermsDocument } from '@/features/auth/components';
import { MY_MESSAGES } from '@/features/my/constants/messages';
import { MY_PATHS } from '@/features/my/constants/paths';

// MY에서 보는 약관(서비스 이용약관·개인정보 처리방침·추가 개인정보 수집 동의서 전문)만 정적으로 만들고 그 밖의 주소는 404
const MY_TERMS_IDS: readonly TermsDocumentId[] = ['service', 'privacy', 'demographics'];
const isMyTermsId = (value: string): value is TermsDocumentId =>
  (MY_TERMS_IDS as readonly string[]).includes(value);
// 탭 제목·화면 밖 h1은 MY 메뉴 이름(가입 약관 원문의 제목 「필수 수집 항목 동의서」 등과 다름)
const MY_TERMS_TITLES: Partial<Record<TermsDocumentId, string>> = {
  service: MY_MESSAGES.menu.termsOfService,
  privacy: MY_MESSAGES.menu.privacyPolicy,
  demographics: MY_MESSAGES.termsSettings.demographics.title,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return MY_TERMS_IDS.map((termId) => ({ termId }));
}

type Params = { params: Promise<{ termId: string }> };

// 내 계정 메뉴 아래 화면이라 검색에서 제외(같은 원문은 가입 약관에도 있음)
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { termId } = await params;
  const title = isMyTermsId(termId) ? MY_TERMS_TITLES[termId] : undefined;
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
      <TermsDocument
        documentId={termId}
        hideTitle
        title={MY_TERMS_TITLES[termId]}
        backFallback={MY_PATHS.termsAndPrivacy}
      />
    </div>
  );
}
