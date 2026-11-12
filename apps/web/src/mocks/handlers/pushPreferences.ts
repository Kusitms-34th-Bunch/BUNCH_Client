import { http } from 'msw';
import { mockDb } from '../db';
import { PUSH_NOTIFICATION_TYPES } from '../db/seed';
import { fail, ok } from '../lib/envelope';

// BFF 경로는 백엔드 경로에서 `/api/v1`을 뺀 경로(docs/architecture/api-boundary.md)
const KNOWN_TYPES: ReadonlySet<string> = new Set(PUSH_NOTIFICATION_TYPES);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const pushPreferenceHandlers = [
  // GET /api/v1/members/me/push-preferences
  http.get('/api/members/me/push-preferences', () => ok(mockDb.get().pushPreferences)),

  // PATCH /api/v1/members/me/push-preferences: 보낸 값만 바꾸고 전체 설정을 돌려줌
  // 알 수 없는 알림 종류는 COMMON_001, 불리언이 아닌 값은 COMMON_002(Notion 푸시 수신 설정 변경)
  http.patch('/api/members/me/push-preferences', async ({ request }) => {
    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) return fail(400, 'COMMON_002');
    const { enabled, types } = body;
    if (enabled !== undefined && typeof enabled !== 'boolean') return fail(400, 'COMMON_002');
    if (types !== undefined && !isRecord(types)) return fail(400, 'COMMON_002');

    const changes = types ?? {};
    if (Object.keys(changes).some((type) => !KNOWN_TYPES.has(type))) return fail(400, 'COMMON_001');
    if (Object.values(changes).some((value) => typeof value !== 'boolean')) {
      return fail(400, 'COMMON_002');
    }

    const current = mockDb.get().pushPreferences;
    const next = {
      enabled: enabled ?? current.enabled,
      types: { ...current.types, ...(changes as Record<string, boolean>) },
    };
    mockDb.update((state) => ({ ...state, pushPreferences: next }));
    return ok(next);
  }),
];
