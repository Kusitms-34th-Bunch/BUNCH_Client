/** 원문 화면이 있는 약관 */
export const TERMS_DOCUMENT_IDS = ['service', 'privacy'] as const;
export type TermsDocumentId = (typeof TERMS_DOCUMENT_IDS)[number];

export const isTermsDocumentId = (value: string): value is TermsDocumentId =>
  (TERMS_DOCUMENT_IDS as readonly string[]).includes(value);

/** 동의 항목 id(원문 없는 항목 포함) */
export type TermsId = TermsDocumentId | 'age';

export type TermsItem = {
  id: TermsId;
  label: string;
  /** 있으면 약관 내용 보기 버튼과 원문 이동 */
  documentId?: TermsDocumentId;
};

// 필수 약관 3개(마케팅 동의 없음), 노출 순서
export const TERMS_ITEMS: readonly TermsItem[] = [
  { id: 'service', label: '서비스 이용 약관', documentId: 'service' },
  { id: 'privacy', label: '개인정보 수집 및 이용 동의', documentId: 'privacy' },
  { id: 'age', label: '만 14세 이상입니다' },
];
