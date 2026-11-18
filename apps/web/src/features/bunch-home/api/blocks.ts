import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { toWireId } from '@/shared/api/ids';
import { toReportRequest } from '@/shared/lib/reportReasons';
import { blockPageSchema, bunchReportResultSchema } from '../model/blocks';

// 데이터 없는 성공 응답(Swagger `ApiResponseUnit`)은 data가 빠지거나 null
const unitSchema = z.null().optional();

// 차단 목록 한 쪽 크기(한 번에 받을 수 있는 최대)
const LIST_PAGE_SIZE = 50;

const bunchPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}`;
const blockPath = (viewerId: string, targetId: string) =>
  `${bunchPath(viewerId)}/blocks/${encodeURIComponent(targetId)}`;

/** 내 번치가 차단한 번치 한 쪽(최근 차단순, 0부터) */
export const getBlockedBunches = (viewerId: string, page: number, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(viewerId)}/blocks`, {
      searchParams: { page, size: LIST_PAGE_SIZE },
      signal: signal ?? null,
    }),
    blockPageSchema,
    'blocked bunches',
  );

/** 다른 번치 차단(이미 차단했으면 그대로) */
export const blockBunch = async (viewerId: string, targetId: string) => {
  await requestData(bffApi.put(blockPath(viewerId, targetId)), unitSchema, 'block bunch');
};

/** 차단 해제. `blockId`는 차단 목록 항목의 ID */
export const unblockBunch = async (viewerId: string, targetId: string, blockId: string) => {
  const id = toWireId(blockId);
  if (id === undefined) throw new Error('차단 ID가 올바르지 않습니다.');
  await requestData(
    bffApi.delete(blockPath(viewerId, targetId), { searchParams: { blockId: id } }),
    unitSchema,
    'unblock bunch',
  );
};

/** 다른 번치 신고. 사유는 화면 값(`shared/lib/reportReasons`) */
export const reportBunch = (
  viewerId: string,
  targetId: string,
  value: { reason: string; detail: string },
) => {
  const target = toWireId(targetId);
  if (target === undefined) throw new Error('신고 내용이 올바르지 않습니다.');
  return requestData(
    bffApi.post(`${bunchPath(viewerId)}/reports`, {
      json: { targetBunchId: target, ...toReportRequest(value) },
    }),
    bunchReportResultSchema,
    'report bunch',
  );
};
