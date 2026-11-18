// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readInvitationBunchName } from './invitationPreview';

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn((_request: Request) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const envelope = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, error: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('readInvitationBunchName', () => {
  it('공개 초대 카드에서 번치 이름을 읽고, 토큰은 경로 조각으로 인코딩해 인증 없이 보낸다', async () => {
    const fetchMock = stubFetch(envelope({ name: '퇴근런클럽', introduction: '', code: 'A' }));

    await expect(readInvitationBunchName('a/b c')).resolves.toBe('퇴근런클럽');

    const request = fetchMock.mock.calls[0]?.[0];
    expect(request?.url).toBe('https://backend.example.com/api/v1/invitations/a%2Fb%20c');
    expect(request?.headers.get('authorization')).toBeNull();
  });

  it.each([
    ['없거나 만료된 링크(404)', new Response('{}', { status: 404 })],
    ['서버 오류', new Response('{}', { status: 500 })],
    ['연결 실패', new Error('network')],
    ['이름이 빈 응답', envelope({ name: '  ' })],
    ['이름이 지나치게 긴 응답', envelope({ name: '가'.repeat(51) })],
  ])('%s면 null(기본 미리보기)', async (_name, response) => {
    const fetchMock = stubFetch(response);

    await expect(readInvitationBunchName('abc')).resolves.toBeNull();
    // 재시도하지 않음(대기 상한 3초 유지)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
