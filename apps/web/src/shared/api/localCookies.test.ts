import { describe, expect, it } from 'vitest';
import {
  forwardSetCookies,
  isLocalHttpOrigin,
  rewriteSetCookieForLocalDev,
  splitSetCookieHeader,
} from './localCookies';

describe('isLocalHttpOrigin', () => {
  it('is true for http localhost', () => {
    expect(isLocalHttpOrigin('http://localhost:3000/x')).toBe(true);
  });

  it('is true for http 127.0.0.1', () => {
    expect(isLocalHttpOrigin('http://127.0.0.1:3000/x')).toBe(true);
  });

  it('is false for https localhost', () => {
    expect(isLocalHttpOrigin('https://localhost:3000/x')).toBe(false);
  });

  it('is false for a production host', () => {
    expect(isLocalHttpOrigin('https://example.com/x')).toBe(false);
  });
});

describe('rewriteSetCookieForLocalDev', () => {
  it('strips the Domain attribute', () => {
    const result = rewriteSetCookieForLocalDev('session=abc; Domain=example.com; Path=/');
    expect(result).toBe('session=abc; Path=/');
  });

  it('strips the Secure attribute', () => {
    const result = rewriteSetCookieForLocalDev('session=abc; Secure; Path=/');
    expect(result).toBe('session=abc; Path=/');
  });

  it('downgrades SameSite=None to Lax', () => {
    const result = rewriteSetCookieForLocalDev('session=abc; SameSite=None; Path=/');
    expect(result).toBe('session=abc; SameSite=Lax; Path=/');
  });

  it('keeps other attributes untouched', () => {
    const result = rewriteSetCookieForLocalDev('session=abc; Path=/; HttpOnly');
    expect(result).toBe('session=abc; Path=/; HttpOnly');
  });
});

describe('splitSetCookieHeader', () => {
  it('reads multiple set-cookie headers via getSetCookie', () => {
    const headers = new Headers();
    headers.append('set-cookie', 'a=1; Path=/');
    headers.append('set-cookie', 'b=2; Path=/');
    expect(splitSetCookieHeader(headers)).toEqual(['a=1; Path=/', 'b=2; Path=/']);
  });

  it('falls back to a comma split when getSetCookie is unavailable', () => {
    const headers = { get: () => 'a=1; Path=/, b=2; Path=/' } as unknown as Headers;
    expect(splitSetCookieHeader(headers)).toEqual(['a=1; Path=/', 'b=2; Path=/']);
  });

  it('returns an empty array when no cookie is set', () => {
    expect(splitSetCookieHeader(new Headers())).toEqual([]);
  });
});

describe('forwardSetCookies', () => {
  it('rewrites cookies for a local http request', () => {
    const upstream = new Headers();
    upstream.set('set-cookie', 'session=abc; Domain=example.com; Secure; SameSite=None; Path=/');
    const response = new Headers();

    forwardSetCookies(upstream, response, 'http://localhost:3000/api/x');

    expect(response.get('set-cookie')).toBe('session=abc; SameSite=Lax; Path=/');
  });

  it('forwards cookies unchanged for a production request', () => {
    const upstream = new Headers();
    upstream.set('set-cookie', 'session=abc; Domain=example.com; Secure; Path=/');
    const response = new Headers();

    forwardSetCookies(upstream, response, 'https://app.example.com/api/x');

    expect(response.get('set-cookie')).toBe('session=abc; Domain=example.com; Secure; Path=/');
  });
});
