import type { TermsDocumentId } from '../../constants/terms';
import { TERMS_DOCUMENTS } from '../../constants/termsDocuments';
import { SignupFrame } from './SignupFrame';

/** 약관 원문 화면(임시 문구, 약관 이름은 헤더의 h1) */
export function TermsDocument({ documentId }: { documentId: TermsDocumentId }) {
  const { title, effectiveDate, version, articles } = TERMS_DOCUMENTS[documentId];

  return (
    <SignupFrame title={<h1 className="truncate">{title}</h1>}>
      <div className="px-padding-p8 pt-s6 pb-padding-p8 gap-s12 flex flex-col">
        <div className="typography-body-2-regular text-text-quaternary gap-x-s4 flex flex-wrap items-center justify-between">
          <span>시행일자: {effectiveDate}</span>
          <span>버전 {version}</span>
        </div>
        <div className="gap-s12 flex flex-col">
          {articles.map(({ title: articleTitle, paragraphs, items }) => (
            <article key={articleTitle} className="gap-s3 flex flex-col">
              <h2 className="typography-body-1-semi-bold text-text-primary">{articleTitle}</h2>
              <div className="typography-body-2-regular text-text-tertiary [overflow-wrap:anywhere] break-keep">
                {paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {items ? (
                  <ol className="ms-[21px] list-decimal">
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
