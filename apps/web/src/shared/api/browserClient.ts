import { createHttpClient } from '@app/api-core/http';
import { HTTPError, type KyInstance } from 'ky';

export interface BrowserApiOptions {
  baseUrl?: string;
  timeoutMs?: number;
  getAccessToken: () => string | undefined;
  refreshAccessToken: () => Promise<string | undefined>;
  onUnauthorized?: () => void | Promise<void>;
}

const REFRESH_LOCK_NAME = 'api-core:refresh';

export const createBrowserApi = (options: BrowserApiOptions): KyInstance => {
  let refreshing: Promise<string | undefined> | undefined;

  const refresh = async (): Promise<string | undefined> => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(REFRESH_LOCK_NAME, () => options.refreshAccessToken());
    }
    return options.refreshAccessToken();
  };

  const runRefresh = () => {
    refreshing ??= refresh().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  };

  const client: KyInstance = createHttpClient({
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    hooks: {
      beforeRequest: [
        ({ request }) => {
          const token = options.getAccessToken();
          if (token) request.headers.set('Authorization', `Bearer ${token}`);
        },
      ],
      beforeRetry: [
        async ({ request, error }) => {
          if (!(error instanceof HTTPError) || error.response.status !== 401) return;

          const token = await runRefresh();
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
            return;
          }

          await options.onUnauthorized?.();
        },
      ],
    },
    retry: {
      limit: 1,
      methods: ['get', 'post', 'put', 'patch', 'delete'],
      statusCodes: [401],
    },
  });

  return client;
};
