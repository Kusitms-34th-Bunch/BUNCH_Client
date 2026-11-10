import type { ReportReason } from '@app/design-system/web';

// 신고 사유(번치·댓글·번들 공통, 화면설계서 2500:69551 3번·Figma 5367:121909). 기타는 상세 사유 필수
export const REPORT_REASONS: ReportReason[] = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '음란 · 부적절한 내용' },
  { value: 'harassment', label: '괴롭힘 · 욕설' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'other', label: '기타' },
];

export const REPORT_OTHER = 'other';
