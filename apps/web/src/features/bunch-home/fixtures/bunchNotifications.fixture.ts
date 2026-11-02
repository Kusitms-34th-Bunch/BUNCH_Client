import type { BunchNotification } from '../lib/types';

// 알림 API 연결 전 번치별 알림(최신순). 문구는 Figma 1892:36947, 읽지 않은 수는 전환 목록의 알림 수와 같게 맞춤
const candidate = (id: string, time: string, unread: boolean): BunchNotification => ({
  id,
  title: '새로운 번들 후보가 생겼어요',
  description: '함께한 순간들을 확인하고 새로운 번들로 만들어 보세요.',
  time,
  unread,
});

export const bunchNotificationsFixture: Readonly<Record<string, readonly BunchNotification[]>> = {
  'bunch-run': [candidate('run-1', '어제', false), candidate('run-2', '3일 전', false)],
  'bunch-trip': [
    candidate('trip-1', '방금 전', true),
    candidate('trip-2', '2시간 전', true),
    candidate('trip-3', '어제', true),
    candidate('trip-4', '3일 전', true),
    candidate('trip-5', '1주 전', true),
    candidate('trip-6', '2주 전', false),
  ],
  'bunch-gift': [
    candidate('gift-1', '10분 전', true),
    candidate('gift-2', '5시간 전', true),
    candidate('gift-3', '어제', true),
    candidate('gift-4', '2일 전', true),
    candidate('gift-5', '1주 전', true),
  ],
};
