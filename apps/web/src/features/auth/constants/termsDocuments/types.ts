/** 원문 안 링크(이메일·웹 주소) */
export type TermsLink = { text: string; href: string };

/** 원문 한 줄. 링크가 섞이면 글자와 링크를 순서대로 나열 */
export type TermsText = string | readonly (string | TermsLink)[];

export type TermsListItem =
  | TermsText
  /** 아래에 글머리 목록이 붙는 항목 */
  | { text: TermsText; children: readonly TermsText[] };

/**
 * 조항 본문의 덩어리
 * - paragraph: 문단. 「①」 같은 항 번호는 원문 글자 그대로 둠
 * - ordered: 「1.」 번호 목록(번호는 목록이 매김)
 * - bullet: 글머리 목록
 * - subheading: 조항 안 소제목(국외 이전 업체 이름 등)
 */
export type TermsBlock =
  | { type: 'paragraph'; text: TermsText }
  | { type: 'ordered'; items: readonly TermsListItem[] }
  | { type: 'bullet'; items: readonly TermsListItem[] }
  | { type: 'subheading'; text: string };

export type TermsSection = {
  /** 조항 제목(「제 1조 (목적)」, 「부칙」 등) */
  title: string;
  blocks: readonly TermsBlock[];
};

export type TermsDocumentContent = {
  /** 화면 제목 */
  title: string;
  /** 시행일(YYYY. MM. DD) */
  effectiveDate: string;
  /** 버전 숫자(「버전 1.0」으로 보임) */
  version: string;
  /** 첫 조항 앞 머리말 */
  intro?: readonly TermsBlock[];
  sections: readonly TermsSection[];
};

/** 원문 작성용 짧은 표기 */
export const p = (text: TermsText): TermsBlock => ({ type: 'paragraph', text });
export const ol = (...items: TermsListItem[]): TermsBlock => ({ type: 'ordered', items });
export const ul = (...items: TermsListItem[]): TermsBlock => ({ type: 'bullet', items });
export const h3 = (text: string): TermsBlock => ({ type: 'subheading', text });
export const link = (text: string, href: string): TermsLink => ({ text, href });
export const email = (address: string): TermsLink => link(address, `mailto:${address}`);
