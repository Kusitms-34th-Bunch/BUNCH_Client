import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { feedPageSchema } from '../model/feed';

/** 한 번에 받을 번들 수(광고·안내 제외, 서버 허용 1~50). 카드가 커서 10개도 몇 화면이고, 끝 전에 미리 받아 첫 응답을 가볍게 */
export const FEED_PAGE_SIZE = 10;

/** 팔로잉·공개 피드 한 쪽. cursor가 없으면 처음부터(지금 번치는 서버가 정함) */
export const getFeedPage = (cursor: string | undefined, signal?: AbortSignal) =>
  requestData(
    bffApi.get('feed', {
      searchParams: cursor ? { size: FEED_PAGE_SIZE, cursor } : { size: FEED_PAGE_SIZE },
      signal: signal ?? null,
    }),
    feedPageSchema,
    'feed',
  );
