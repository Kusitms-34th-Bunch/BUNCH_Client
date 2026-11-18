import type { TermsDocumentId } from '../../constants/terms';
import {
  TERMS_DOCUMENTS,
  type TermsBlock,
  type TermsListItem,
  type TermsText,
} from '../../constants/termsDocuments';
import { SignupFrame } from './SignupFrame';

type TermsDocumentProps = {
  documentId: TermsDocumentId;
  /** 헤더에 약관 이름을 보이지 않음(MY 약관 화면 Figma는 뒤로 가기만, 이름은 화면 밖 h1로 유지) */
  hideTitle?: boolean;
  /** 직접 진입이라 돌아갈 기록이 없을 때 뒤로 가기로 갈 경로 */
  backFallback?: string | undefined;
};

/** 약관 원문 화면(약관 이름은 h1: 헤더에 보이거나 화면 밖, 조항 제목 h2, 조항 안 소제목 h3) */
export function TermsDocument({ documentId, hideTitle = false, backFallback }: TermsDocumentProps) {
  const { title, effectiveDate, version, intro, sections } = TERMS_DOCUMENTS[documentId];

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
        {intro ? <Blocks blocks={intro} /> : null}
        <div className="gap-s12 flex flex-col">
          {sections.map(({ title: sectionTitle, blocks }) => (
            <section key={sectionTitle} className="gap-s3 flex flex-col">
              <h2 className="typography-body-1-semi-bold text-text-primary">{sectionTitle}</h2>
              <Blocks blocks={blocks} />
            </section>
          ))}
        </div>
      </div>
    </SignupFrame>
  );
}

// 원문 덩어리는 순서가 바뀌지 않는 정적 문서라 index를 key로 씀
function Blocks({ blocks }: { blocks: readonly TermsBlock[] }) {
  return (
    <div className="typography-body-3-regular text-text-tertiary gap-s3 flex flex-col wrap-anywhere break-keep">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={index}>
                <Text text={block.text} />
              </p>
            );
          case 'subheading':
            return (
              <h3 key={index} className="typography-body-3-semibold text-text-secondary pt-s2">
                {block.text}
              </h3>
            );
          case 'ordered':
            return (
              <ol key={index} className="ms-5.25 list-decimal">
                <ListItems items={block.items} />
              </ol>
            );
          case 'bullet':
            return (
              <ul key={index} className="ms-5.25 list-disc">
                <ListItems items={block.items} />
              </ul>
            );
        }
      })}
    </div>
  );
}

function ListItems({ items }: { items: readonly TermsListItem[] }) {
  return items.map((item, index) =>
    typeof item === 'object' && 'children' in item ? (
      <li key={index}>
        <Text text={item.text} />
        <ul className="ms-5.25 list-[circle]">
          {item.children.map((child, childIndex) => (
            <li key={childIndex}>
              <Text text={child} />
            </li>
          ))}
        </ul>
      </li>
    ) : (
      <li key={index}>
        <Text text={item} />
      </li>
    ),
  );
}

function Text({ text }: { text: TermsText }) {
  if (typeof text === 'string') return text;
  return text.map((part, index) =>
    typeof part === 'string' ? (
      part
    ) : (
      // 같은 창 이동으로 둠: 쉘은 앱 출처가 아닌 이동을 가로채 바깥 앱(브라우저·메일)으로 엶
      // target="_blank"는 쉘에 새 창 처리(onOpenWindow)가 없어 Android에서 반응하지 않을 수 있음
      <a key={index} href={part.href} className="underline underline-offset-2">
        {part.text}
      </a>
    ),
  );
}
