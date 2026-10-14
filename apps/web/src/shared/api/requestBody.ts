import { ApiError } from '@app/api-core';

export const parseRequestBody = async (request: Request): Promise<unknown> => {
  if (request.method === 'GET' || request.method === 'DELETE') return undefined;

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    return request.formData();
  }

  if (contentType.includes('application/json')) {
    const text = await request.text();
    if (!text) return undefined;

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError({
        message: '요청 본문이 올바른 JSON 형식이 아닙니다.',
        category: 'validation',
        status: 400,
      });
    }
  }

  return undefined;
};
