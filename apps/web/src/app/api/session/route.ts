import { createAuthorizedRoute } from '@/shared/api/server/createAuthorizedRoute';

export const GET = createAuthorizedRoute(() => Promise.resolve({ authenticated: true }));
