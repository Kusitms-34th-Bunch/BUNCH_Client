import { ApiError, normalizeError, parseOrThrow } from '@app/api-core';
import { type AppVersion, appVersionSchema } from '@app/bridge';
import { z } from 'zod';
import { bffApi } from '@/shared/api/client/bffApi';
import { appBridge, hasNativeMethod } from '@/shared/bridge/client';

// envelope 없음: 백엔드를 거치지 않는 웹 BFF 전용 Route Handler의 직접 응답
const responseSchema = z.object({ updateRequired: z.boolean() });

/** 쉘의 앱 버전으로 웹 BFF(`GET /api/app-version`)에 업데이트 필요 여부를 물음. `getAppVersion`이 없는 이전 쉘은 `legacy` */
export const getUpdateRequired = async (signal?: AbortSignal) => {
  try {
    let app: AppVersion | 'legacy' = 'legacy';
    if (hasNativeMethod('getAppVersion')) {
      // 쉘 실패·시간 초과(2초)는 값 없이 끝남: 네트워크 오류로 실패시켜 보고에서 빼고 다음 복귀 때 다시 물음
      const reported = (await appBridge.getAppVersion()) as AppVersion | undefined;
      if (reported === undefined) {
        throw new ApiError({ message: 'app version bridge timeout', category: 'network' });
      }
      app = parseOrThrow(appVersionSchema, reported, 'app version bridge');
    }
    const searchParams = app === 'legacy' ? { version: 'legacy' } : app;
    const body = await bffApi.get('app-version', { searchParams, signal: signal ?? null }).json();
    return parseOrThrow(responseSchema, body, 'app version').updateRequired;
  } catch (error) {
    // 네트워크·4xx는 ApiError로 분류해 오류 보고에서 빠지게 함
    throw normalizeError(error);
  }
};
