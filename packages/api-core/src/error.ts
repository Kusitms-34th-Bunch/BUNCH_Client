import { isHTTPError, isNetworkError, isTimeoutError } from 'ky';

export type ApiErrorCategory = 'auth' | 'network' | 'server' | 'validation' | 'unknown';

export interface ApiErrorOptions {
  message: string;
  category: ApiErrorCategory;
  status?: number | undefined;
  code?: string | undefined;
  data?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  category: ApiErrorCategory;
  status?: number | undefined;
  code?: string | undefined;
  data?: unknown;

  constructor({ message, category, status, code, data, cause }: ApiErrorOptions) {
    super(message, { cause });
    this.name = 'ApiError';
    this.category = category;
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const categoryFromStatus = (status: number): ApiErrorCategory => {
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'validation';
  return 'unknown';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// 서버 envelope(`{ success, data, error: { code, message } }`)과 BFF 응답(`{ code, message }`) 모두 지원
const errorBody = (data: unknown) => (isRecord(data) && isRecord(data.error) ? data.error : data);

const extractMessage = (data: unknown, fallback: string) => {
  const body = errorBody(data);
  if (isRecord(body) && typeof body.message === 'string') return body.message;
  return fallback;
};

const extractCode = (data: unknown) => {
  const body = errorBody(data);
  if (isRecord(body) && typeof body.code === 'string') return body.code;
  return undefined;
};

export type ErrorMessageOverrides = Record<string, string>;

export const normalizeError = (
  error: unknown,
  messageOverrides?: ErrorMessageOverrides,
): ApiError => {
  if (isApiError(error)) return error;

  if (isHTTPError(error)) {
    const status = error.response.status;
    const code = extractCode(error.data);
    const override = code ? messageOverrides?.[code] : undefined;

    return new ApiError({
      message: override ?? extractMessage(error.data, error.message),
      category: categoryFromStatus(status),
      status,
      code,
      data: error.data,
      cause: error,
    });
  }

  if (isTimeoutError(error) || isNetworkError(error)) {
    return new ApiError({ message: error.message, category: 'network', cause: error });
  }

  if (error instanceof Error) {
    return new ApiError({ message: error.message, category: 'unknown', cause: error });
  }

  return new ApiError({ message: 'Unknown error', category: 'unknown', cause: error });
};
