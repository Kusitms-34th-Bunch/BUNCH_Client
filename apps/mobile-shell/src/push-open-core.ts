// 푸시를 눌러 앱을 연 응답에서 서버 payload를 꺼내는 순수 로직(React Native 모듈 없음, Node 테스트로 확인)
// 서버 APNs payload(명세 072): { aps, eventId, type, target: {...}, notificationId? }. target에는 null인 필드(parentCommentId)도 올 수 있어 아는 필드만 고름

export type PushOpenTarget = {
  kind: string;
  bunchId: number;
  bundleId?: number;
  noticeId?: number;
  targetBunchId?: number;
  sourceBunchId?: number;
  commentId?: number;
};
export type PushOpen = { target: PushOpenTarget; notificationId: number | null };

const ID_KEYS = ['bundleId', 'noticeId', 'targetBunchId', 'sourceBunchId', 'commentId'] as const;
const MAX_KIND_LENGTH = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const fromPayload = (payload: unknown): PushOpen | null => {
  if (!isRecord(payload) || !isRecord(payload.target)) return null;
  const { kind, bunchId } = payload.target;
  if (typeof kind !== 'string' || kind.length === 0 || kind.length > MAX_KIND_LENGTH) return null;
  if (!isId(bunchId)) return null;
  const target: PushOpenTarget = { kind, bunchId };
  for (const key of ID_KEYS) {
    const value = payload.target[key];
    if (isId(value)) target[key] = value;
  }
  return { target, notificationId: isId(payload.notificationId) ? payload.notificationId : null };
};

/** 알림 응답의 request에서 서버 payload를 찾음: iOS 원격 푸시는 `trigger.payload`(userInfo), 그 밖은 `content.data`. 맞지 않으면 null */
export const toPushOpen = (request: unknown): PushOpen | null => {
  if (!isRecord(request)) return null;
  const trigger = isRecord(request.trigger) ? request.trigger : undefined;
  const content = isRecord(request.content) ? request.content : undefined;
  return fromPayload(trigger?.payload) ?? fromPayload(content?.data);
};
