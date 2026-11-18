import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { updateBunchProfile } from './bunchHome';

const JPEG = 'data:image/jpeg;base64,/9j/2wBDAA==';
const base = {
  name: ' 여행쥬아 ',
  introduction: ' 소개 ',
  isPrivate: false,
  expectedProfileVersion: 3,
};

// 서버가 받은 multipart를 꺼내 봄
const capture = () => {
  const seen: { form?: FormData; key?: string | null } = {};
  server.use(
    http.put('/api/bunches/:bunchId/profile', async ({ request }) => {
      seen.form = await request.formData();
      seen.key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
      return ok({ bunchId: 1, profileVersion: 4 });
    }),
  );
  return seen;
};
const profilePart = async (form: FormData | undefined) =>
  JSON.parse(await (form?.get('profile') as Blob).text()) as Record<string, unknown>;

describe('updateBunchProfile', () => {
  it('새 사진이면 profile JSON과 photo 파트를 보내고, 이름·소개는 다듬어 보낸다', async () => {
    const seen = capture();

    await updateBunchProfile('1', { ...base, image: { action: 'REPLACE', photo: JPEG } }, 'k-1');

    expect(seen.key).toBe('k-1');
    expect(await profilePart(seen.form)).toEqual({
      name: '여행쥬아',
      introduction: '소개',
      visibility: 'PUBLIC',
      imageAction: 'REPLACE',
      expectedProfileVersion: 3,
    });
    expect((seen.form?.get('photo') as File).type).toBe('image/jpeg');
  });

  it('기본 이미지면 photo 파트를 보내지 않는다', async () => {
    const seen = capture();

    await updateBunchProfile('1', { ...base, image: { action: 'RESET' } }, 'k-2');

    expect((await profilePart(seen.form)).imageAction).toBe('RESET');
    expect(seen.form?.get('photo')).toBeNull();
  });

  it('JPEG가 아닌 사진은 보내지 않고 실패한다', async () => {
    await expect(
      updateBunchProfile(
        '1',
        { ...base, image: { action: 'REPLACE', photo: 'data:image/png;base64,iVBORw0KGgo=' } },
        'k-3',
      ),
    ).rejects.toThrow();
  });
});
