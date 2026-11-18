import { isApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import { parseRequestBody } from './requestBody';

const jsonRequest = (body: string) =>
  new Request('https://example.com/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('parseRequestBody', () => {
  it('returns undefined for GET requests', async () => {
    const request = new Request('https://example.com/x', { method: 'GET' });
    expect(await parseRequestBody(request)).toBeUndefined();
  });

  it('returns undefined for DELETE requests', async () => {
    const request = new Request('https://example.com/x', { method: 'DELETE' });
    expect(await parseRequestBody(request)).toBeUndefined();
  });

  it('parses a JSON body', async () => {
    const result = await parseRequestBody(jsonRequest('{"a":1}'));
    expect(result).toEqual({ a: 1 });
  });

  it('returns undefined for an empty JSON body', async () => {
    expect(await parseRequestBody(jsonRequest(''))).toBeUndefined();
  });

  it('throws a 400 ApiError for a malformed JSON body', async () => {
    try {
      await parseRequestBody(jsonRequest('{not json'));
      expect.unreachable();
    } catch (error) {
      expect(isApiError(error)).toBe(true);
      if (isApiError(error)) {
        expect(error.status).toBe(400);
        expect(error.category).toBe('validation');
      }
    }
  });

  it('parses a multipart/form-data body', async () => {
    const form = new FormData();
    form.set('name', 'a');
    const request = new Request('https://example.com/x', { method: 'POST', body: form });
    const result = await parseRequestBody(request);
    expect(typeof (result as FormData).get).toBe('function');
    expect((result as FormData).get('name')).toBe('a');
  });

  it('returns undefined for an unrecognized content type', async () => {
    const request = new Request('https://example.com/x', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello',
    });
    expect(await parseRequestBody(request)).toBeUndefined();
  });
});
