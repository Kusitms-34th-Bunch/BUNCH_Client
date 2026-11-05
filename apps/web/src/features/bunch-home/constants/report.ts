import type { ReportReason } from '@app/design-system/web';

// 번치 신고 사유(화면설계서 2500:69551 3번). 기타는 상세 사유 필수
export const BUNCH_REPORT_REASONS: ReportReason[] = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '음란 · 부적절한 내용' },
  { value: 'harassment', label: '괴롭힘 · 욕설' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'other', label: '기타' },
];

export const BUNCH_REPORT_OTHER = 'other';
