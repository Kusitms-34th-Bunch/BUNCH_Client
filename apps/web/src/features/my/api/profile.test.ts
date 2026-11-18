import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { updateMyProfile } from './profile';

// 1x1 JPEG가 아니어도 형식만 보면 되므로 짧은 본문
const JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQ';

/** 보낸 multipart를 읽어 돌려줌 */
const captureProfile = () => {
  const sent: { profile?: unknown; photo?: FormDataEntryValue | null } = {};
  server.use(
    http.put('/api/members/me/profile', async ({ request }) => {
      const form = await request.formData();
      const part = form.get('profile');
      sent.profile = part instanceof Blob ? JSON.parse(await part.text()) : null;
      sent.photo = form.get('photo');
      return ok({ memberId: 5, nickname: '큐시즘', imageUrl: null });
    }),
  );
  return sent;
};

describe('updateMyProfile', () => {
  it('사진을 그대로 두거나 기본 이미지로 바꾸면 사진 파일 없이 처리만 보낸다', async () => {
    const sent = captureProfile();
    await updateMyProfile({ nickname: '큐시즘', photo: { action: 'KEEP' } });
    expect(sent).toEqual({ profile: { nickname: '큐시즘', imageAction: 'KEEP' }, photo: null });

    await updateMyProfile({ nickname: '큐시즘', photo: { action: 'RESET' } });
    expect(sent).toEqual({ profile: { nickname: '큐시즘', imageAction: 'RESET' }, photo: null });
  });

  it('출생연도·성별을 넣으면 서버 값으로 바꿔 함께 보내고, 비운 값은 키를 뺀다', async () => {
    const sent = captureProfile();
    await updateMyProfile({
      nickname: '큐시즘',
      photo: { action: 'KEEP' },
      demographics: { birthYear: 2003, gender: 'female' },
    });
    expect(sent.profile).toEqual({
      nickname: '큐시즘',
      imageAction: 'KEEP',
      demographics: { birthYear: 2003, gender: 'FEMALE' },
    });

    await updateMyProfile({
      nickname: '큐시즘',
      photo: { action: 'KEEP' },
      demographics: { birthYear: undefined, gender: undefined },
    });
    expect(sent.profile).toEqual({ nickname: '큐시즘', imageAction: 'KEEP', demographics: {} });
  });

  it('새 사진이면 JPEG 파일을 함께 보낸다', async () => {
    const sent = captureProfile();
    await updateMyProfile({
      nickname: '큐시즘',
      photo: { action: 'REPLACE', photo: JPEG_DATA_URL },
    });

    expect(sent.profile).toEqual({ nickname: '큐시즘', imageAction: 'REPLACE' });
    expect(sent.photo).toBeInstanceOf(File);
    expect((sent.photo as File).type).toBe('image/jpeg');
  });

  it('JPEG가 아닌 사진은 보내지 않고, 서버 거절은 코드와 함께 던진다', async () => {
    const sent = captureProfile();
    await expect(
      updateMyProfile({
        nickname: '큐시즘',
        photo: { action: 'REPLACE', photo: 'data:image/png;base64,iVBORw0K' },
      }),
    ).rejects.toThrow();
    expect(sent.profile).toBeUndefined();

    server.use(http.put('/api/members/me/profile', () => fail(409, 'USER_002')));
    await expect(
      updateMyProfile({ nickname: '중복', photo: { action: 'KEEP' } }),
    ).rejects.toMatchObject({ code: 'USER_002' });
  });
});
