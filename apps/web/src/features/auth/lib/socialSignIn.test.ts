import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithSocial } from './socialSignIn';

const mocks = vi.hoisted(() => ({
  isNative: true,
  available: true,
  socialLogin: vi.fn<(_provider: string) => Promise<unknown>>(),
  post: vi.fn<(_path: string, _options: { json: unknown }) => Promise<unknown>>(),
}));

vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => mocks.isNative,
  loginBridge: {
    isNativeMethodAvailable: () => mocks.available,
    socialLogin: (provider: string) => mocks.socialLogin(provider),
  },
}));

// BFF 로그인 요청의 경로·본문만 확인(204 응답 처리는 로그인 API 테스트 범위 밖)
vi.mock('@/shared/api/bffApi', () => ({
  bffApi: { post: (path: string, options: { json: unknown }) => mocks.post(path, options) },
}));

describe('signInWithSocial', () => {
  beforeEach(() => {
    mocks.isNative = true;
    mocks.available = true;
    mocks.socialLogin.mockReset();
    mocks.post.mockReset();
    mocks.post.mockResolvedValue(undefined);
  });

  it('쉘이 돌려준 토큰과 nonce를 BFF 로그인으로 보내고 성공을 돌려준다', async () => {
    mocks.socialLogin.mockResolvedValue({
      status: 'success',
      provider: 'kakao',
      idToken: 'id-token',
      nonce: 'nonce-1',
    });

    await expect(signInWithSocial('kakao')).resolves.toBe('success');

    expect(mocks.socialLogin).toHaveBeenCalledWith('kakao');
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('auth/login', {
      json: { provider: 'kakao', idToken: 'id-token', nonce: 'nonce-1' },
    });
  });

  it('Google은 nonce 없이도 로그인하고 본문에 nonce를 싣지 않는다', async () => {
    mocks.socialLogin.mockResolvedValue({
      status: 'success',
      provider: 'google',
      idToken: 'id-token',
    });

    await expect(signInWithSocial('google')).resolves.toBe('success');

    expect(mocks.post).toHaveBeenCalledWith('auth/login', {
      json: { provider: 'google', idToken: 'id-token' },
    });
  });

  it('사용자가 로그인 창을 닫으면 BFF를 부르지 않고 취소를 돌려준다', async () => {
    mocks.socialLogin.mockResolvedValue({ status: 'cancelled' });

    await expect(signInWithSocial('apple')).resolves.toBe('cancelled');

    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('앱 밖(브라우저)이거나 쉘이 로그인을 지원하지 않으면 던진다', async () => {
    mocks.isNative = false;
    await expect(signInWithSocial('kakao')).rejects.toThrow();

    mocks.isNative = true;
    mocks.available = false;
    await expect(signInWithSocial('kakao')).rejects.toThrow();

    expect(mocks.socialLogin).not.toHaveBeenCalled();
  });

  it('쉘 SDK 오류는 BFF를 부르지 않고 그대로 던진다', async () => {
    mocks.socialLogin.mockRejectedValue(new Error('SDK 오류'));

    await expect(signInWithSocial('kakao')).rejects.toThrow('SDK 오류');

    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([
    ['nonce가 없는 카카오 결과', 'kakao', { status: 'success', provider: 'kakao', idToken: 't' }],
    ['빈 ID 토큰', 'google', { status: 'success', provider: 'google', idToken: '' }],
    ['알 수 없는 상태', 'google', { status: 'failed' }],
    [
      '요청과 다른 소셜 서비스의 결과',
      'google',
      { status: 'success', provider: 'kakao', idToken: 't', nonce: 'n' },
    ],
  ])('쉘 결과가 계약에 어긋나면(%s) BFF를 부르지 않고 던진다', async (_name, provider, result) => {
    mocks.socialLogin.mockResolvedValue(result);

    await expect(signInWithSocial(provider as 'kakao' | 'google')).rejects.toThrow();

    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('BFF 로그인이 실패하면 던진다', async () => {
    mocks.socialLogin.mockResolvedValue({
      status: 'success',
      provider: 'google',
      idToken: 'id-token',
    });
    mocks.post.mockRejectedValue(new Error('로그인 거절'));

    await expect(signInWithSocial('google')).rejects.toThrow();
  });
});
