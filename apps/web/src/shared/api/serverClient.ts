import 'server-only';
import ky, { type KyInstance } from 'ky';

export interface ServerApiOptions {
  baseUrl: string;
  timeoutMs?: number;
  cookie?: string;
}

export const createServerApi = (options: ServerApiOptions): KyInstance =>
  ky.create({
    baseUrl: options.baseUrl,
    timeout: options.timeoutMs ?? 10_000,
    ...(options.cookie ? { headers: { cookie: options.cookie } } : {}),
  });
