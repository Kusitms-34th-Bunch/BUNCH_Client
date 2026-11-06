import type { TermsDocumentId } from '../../constants/terms';
import { TERMS_DOCUMENTS } from '../../constants/termsDocuments';
import { SignupFrame } from './SignupFrame';

type TermsDocumentProps = {
  documentId: TermsDocumentId;
  /** 헤더에 약관 이름을 보이지 않음(MY 약관 화면 Figma는 뒤로 가기만, 이름은 화면 밖 h1로 유지) */
  hideTitle?: boolean;
  /** 직접 진입이라 돌아갈 기록이 없을 때 뒤로 가기로 갈 경로 */
  backFallback?: string | undefined;
};

/** 약관 원문 화면(임시 문구, 약관 이름은 h1: 헤더에 보이거나 화면 밖) */
export function TermsDocument({ documentId, hideTitle = false, backFallback }: TermsDocumentProps) {
  const { title, effectiveDate, version, articles } = TERMS_DOCUMENTS[documentId];

  return (
    <SignupFrame
      title={<h1 className={hideTitle ? 'sr-only' : 'truncate'}>{title}</h1>}
      backFallback={backFallback}
    >
      <div className="px-padding-p8 pt-s6 pb-padding-p8 gap-s12 flex flex-col">
        <div className="typography-body-3-regular text-text-quinary gap-x-s4 flex flex-wrap items-center justify-between">
          <span>시행일자: {effectiveDate}</span>
          <span>버전 {version}</span>
        </div>
        <div className="gap-s12 flex flex-col">
          {articles.map(({ title: articleTitle, paragraphs, items }) => (
            <article key={articleTitle} className="gap-s3 flex flex-col">
              <h2 className="typography-body-1-semi-bold text-text-primary">{articleTitle}</h2>
              <div className="typography-body-3-regular text-text-tertiary wrap-anywhere break-keep">
                {paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {items ? (
                  <ol className="ms-5.25 list-decimal">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </SignupFrame>
  );
}
