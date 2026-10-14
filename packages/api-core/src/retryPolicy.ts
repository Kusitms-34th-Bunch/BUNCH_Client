import { isApiError } from './error';

const DEFAULT_MAX_RETRY_COUNT = 1;

export const createRetryPolicy = (maxRetryCount = DEFAULT_MAX_RETRY_COUNT) => {
  const shouldRetryQuery = (failureCount: number, error: unknown) => {
    if (failureCount >= maxRetryCount) return false;
    if (!isApiError(error)) return false;
    if (error.category === 'network') return true;
    return typeof error.status === 'number' && error.status >= 500;
  };

  const shouldThrowQueryError = (error: unknown) => {
    if (!isApiError(error)) return true;
    return typeof error.status === 'number' && error.status >= 500;
  };

  return { shouldRetryQuery, shouldThrowQueryError };
};
