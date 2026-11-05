import ky, { type KyInstance, type Options } from 'ky';

export interface HttpClientOptions {
  baseUrl?: string | undefined;
  timeoutMs?: number | undefined;
  hooks?: Options['hooks'] | undefined;
  retry?: Options['retry'] | undefined;
}

/**
 * 앱별 인증·세션 정책을 주입할 수 있는 공통 HTTP transport 생성
 * endpoint 함수 밖에서 직접 사용 금지
 */
export const createHttpClient = ({
  baseUrl,
  timeoutMs = 10_000,
  hooks,
  retry,
}: HttpClientOptions): KyInstance =>
  ky.create({
    ...(baseUrl ? { baseUrl } : {}),
    timeout: timeoutMs,
    ...(hooks ? { hooks } : {}),
    ...(retry ? { retry } : {}),
  });
