import type { ServerTermType } from '@/shared/api/termVersions';

/** 원문이 있는 약관 전체(가입·MY 합집합). `privacy`는 가입용 수집 동의서, `privacyPolicy`는 MY 전용 처리방침 */
export const TERMS_DOCUMENT_IDS = ['service', 'privacy', 'demographics', 'privacyPolicy'] as const;
export type TermsDocumentId = (typeof TERMS_DOCUMENT_IDS)[number];

/** 로그인·회원가입에서 여는 원문(`/signup/terms/[termId]`의 termId와 같음) */
export const SIGNUP_TERMS_DOCUMENT_IDS = [
  'service',
  'privacy',
  'demographics',
] as const satisfies readonly TermsDocumentId[];
export type SignupTermsDocumentId = (typeof SIGNUP_TERMS_DOCUMENT_IDS)[number];

export const isSignupTermsDocumentId = (value: string): value is SignupTermsDocumentId =>
  (SIGNUP_TERMS_DOCUMENT_IDS as readonly string[]).includes(value);

/** 동의 항목 id(원문 없는 항목 포함) */
export type TermsId = SignupTermsDocumentId | 'age';

export type TermsItem = {
  id: TermsId;
  label: string;
  /** 필수 약관 여부(필수는 모두 동의해야 시작하기 활성화) */
  required: boolean;
  serverType: ServerTermType;
  /** 있으면 약관 내용 보기 버튼과 원문 이동 */
  documentId?: SignupTermsDocumentId;
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
