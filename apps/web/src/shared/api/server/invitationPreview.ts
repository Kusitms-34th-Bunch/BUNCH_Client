import 'server-only';
import { unwrapEnvelope } from '@app/api-core';
import { z } from 'zod';
import { createServerApi } from './serverClient';

// 링크 미리보기는 메신저가 기다려 주는 시간이 짧아 응답을 오래 기다리지 않음
const PREVIEW_TIMEOUT_MS = 3_000;

// 번치 이름 입력 상한보다 넉넉하게. 넘으면 미리보기가 깨지지 않게 기본 제목으로
const previewSchema = z.object({ name: z.string().trim().min(1).max(50) });

/**
 * 링크 미리보기용 번치 이름(공개 `GET /invitations/{token}`, 서버 렌더 전용)
 * 없거나 만료된 링크·응답 실패·형식 오류는 null(기본 미리보기). 토큰은 경로 조각으로만 쓰고 남기지 않음
 */
export const readInvitationBunchName = async (token: string): Promise<string | null> => {
  try {
    const body = await createServerApi({ timeoutMs: PREVIEW_TIMEOUT_MS })
      // 재시도하면 대기가 상한(3초)을 넘음
      .get(`api/v1/invitations/${encodeURIComponent(token)}`, { retry: 0 })
      .json();
    const parsed = previewSchema.safeParse(unwrapEnvelope(body));
    return parsed.success ? parsed.data.name : null;
  } catch {
    return null;
  }
};
