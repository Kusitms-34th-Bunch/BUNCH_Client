import { createAuthorizedRoute } from '@/shared/api/createAuthorizedRoute';

export const GET = createAuthorizedRoute(() => Promise.resolve({ authenticated: true }));
