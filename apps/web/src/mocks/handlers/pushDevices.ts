import { http } from 'msw';
import { fail, ok } from '../lib/envelope';

// BFF 경로는 백엔드 경로에서 `/api/v1`을 뺀 경로(docs/architecture/api-boundary.md)
const HEX_TOKEN = /^(?:[0-9a-fA-F]{2})+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENVIRONMENTS = new Set(['SANDBOX', 'PRODUCTION']);
const STATUSES = new Set(['NOT_DETERMINED', 'DENIED', 'AUTHORIZED', 'PROVISIONAL']);

// 브라우저에는 푸시 토큰이 없어 이 handler는 쉘 연동 확인과 테스트에서만 쓰임(가짜 서버는 등록 내용을 저장하지 않음)
export const pushDeviceHandlers = [
  // PUT /api/v1/members/me/push-devices/{installationId}: 계약 검증(Notion 푸시 기기 등록·갱신), 토큰은 응답에 돌려주지 않음
  http.put('/api/members/me/push-devices/:installationId', async ({ params, request }) => {
    const installationId = String(params.installationId);
    if (!UUID.test(installationId)) return fail(400, 'COMMON_001');
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== 'object' || body === null) return fail(400, 'COMMON_002');
    const { deviceToken, environment, authorizationStatus } = body as Record<string, unknown>;
    if (
      typeof deviceToken !== 'string' ||
      deviceToken.length < 2 ||
      deviceToken.length > 4096 ||
      !HEX_TOKEN.test(deviceToken) ||
      typeof environment !== 'string' ||
      !ENVIRONMENTS.has(environment) ||
      typeof authorizationStatus !== 'string' ||
      !STATUSES.has(authorizationStatus)
    ) {
      return fail(400, 'COMMON_001');
    }
    return ok({
      installationId,
      environment,
      authorizationStatus,
      registeredAt: new Date().toISOString(),
    });
  }),

  // DELETE /api/v1/members/me/push-devices/{installationId}: 이미 해제됐거나 바인딩이 없어도 멱등 성공
  http.delete('/api/members/me/push-devices/:installationId', ({ params }) =>
    UUID.test(String(params.installationId)) ? ok(null) : fail(400, 'COMMON_001'),
  ),
];
