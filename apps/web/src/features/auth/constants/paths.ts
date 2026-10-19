import type { TermsDocumentId } from './terms';

export const SIGNUP_PATHS = {
  terms: '/signup/terms',
  termsDocument: (documentId: TermsDocumentId) => `/signup/terms/${documentId}`,
} as const;
