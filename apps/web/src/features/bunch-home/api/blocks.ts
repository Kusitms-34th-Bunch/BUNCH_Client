import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { toWireId } from '@/shared/api/ids';
import { blockPageSchema, bunchReportResultSchema, REPORT_REASON } from '../model/blocks';

// 데이터 없는 성공 응답(Swagger `ApiResponseUnit`)은 data가 빠지거나 null
const unitSchema = z.null().optional();

// 차단 목록은 한 번에 받을 수 있는 최대 쪽 크기만(더 불러오기는 UT 이후)
const LIST_PAGE_SIZE = 50;

const bunchPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}`;
const blockPath = (viewerId: string, targetId: string) =>
  `${bunchPath(viewerId)}/blocks/${encodeURIComponent(targetId)}`;

/** 내 번치가 차단한 번치 첫 쪽 */
export const getBlockedBunches = (viewerId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(viewerId)}/blocks`, {
      searchParams: { page: 0, size: LIST_PAGE_SIZE },
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
  { reason, detail }: { reason: string; detail: string },
) => {
  const target = toWireId(targetId);
  // 화면 값만 받음(`__proto__` 같은 상속 속성 이름은 사유 없음)
  const serverReason = Object.hasOwn(REPORT_REASON, reason) ? REPORT_REASON[reason] : undefined;
  if (target === undefined || !serverReason) throw new Error('신고 내용이 올바르지 않습니다.');
  return requestData(
    bffApi.post(`${bunchPath(viewerId)}/reports`, {
      // 상세 사유는 「기타」일 때만(시트도 기타에서만 받음)
      json: {
        targetBunchId: target,
        reason: serverReason,
        ...(serverReason === 'OTHER' && detail.trim() ? { detail: detail.trim() } : {}),
      },
    }),
    bunchReportResultSchema,
    'report bunch',
  );
};
