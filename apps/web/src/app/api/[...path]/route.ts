import { type NextRequest } from 'next/server';
import { proxyToBackend } from '@/shared/api/backendProxy';

type Context = { params: Promise<{ path: string[] }> };

/** 전용 Route Handler가 없는 `/api/*` 요청을 백엔드 `/api/v1/*`로 전달(docs/architecture/api-boundary.md) */
const handler = async (request: NextRequest, { params }: Context) =>
  proxyToBackend(request, (await params).path);

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT };
