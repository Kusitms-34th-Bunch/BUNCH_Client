/** 원문 화면이 있는 약관 */
export const TERMS_DOCUMENT_IDS = ['service', 'privacy', 'demographics'] as const;
export type TermsDocumentId = (typeof TERMS_DOCUMENT_IDS)[number];

export const isTermsDocumentId = (value: string): value is TermsDocumentId =>
  (TERMS_DOCUMENT_IDS as readonly string[]).includes(value);

/** 동의 항목 id(원문 없는 항목 포함) */
export type TermsId = TermsDocumentId | 'age';

/** 서버의 약관 종류(`GET /auth/terms`의 `type`, 동의 저장의 `type`) */
export type ServerTermType = 'SERVICE' | 'PRIVACY' | 'AGE_OVER_14' | 'DEMOGRAPHICS';

export type TermsItem = {
  id: TermsId;
  label: string;
  /** 필수 약관 여부(필수는 모두 동의해야 시작하기 활성화) */
  required: boolean;
  serverType: ServerTermType;
  /** 있으면 약관 내용 보기 버튼과 원문 이동 */
  documentId?: TermsDocumentId;
};

// 필수 3개와 선택 1개(출생연도·성별 수집, 마케팅 동의 없음), 노출 순서
export const TERMS_ITEMS: readonly TermsItem[] = [
  {
    id: 'service',
    label: '서비스 이용 약관',
    required: true,
    serverType: 'SERVICE',
    documentId: 'service',
  },
  {
    id: 'privacy',
    label: '개인정보 수집 및 이용 동의',
    required: true,
    serverType: 'PRIVACY',
    documentId: 'privacy',
  },
  { id: 'age', label: '만 14세 이상입니다', required: true, serverType: 'AGE_OVER_14' },
  {
    id: 'demographics',
    label: '추가 개인정보 수집 및 이용 동의',
    required: false,
    serverType: 'DEMOGRAPHICS',
    documentId: 'demographics',
  },
];
