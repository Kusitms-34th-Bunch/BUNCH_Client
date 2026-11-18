import type { components } from '@app/api-core/generated';
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

type ServerReason = components['schemas']['SocialContentReportRequest']['reason'];

// 화면 값 → 서버 값(번치 신고 `BunchReportRequest`와 같은 enum)
const SERVER_REASON: Readonly<Record<string, ServerReason>> = {
  spam: 'SPAM',
  inappropriate: 'INAPPROPRIATE',
  harassment: 'HARASSMENT',
  privacy: 'PERSONAL_INFORMATION',
  other: 'OTHER',
};

/** 신고 시트 값을 요청 본문의 사유·상세 사유로. 상세 사유는 「기타」일 때만, 모르는 사유는 오류 */
export const toReportRequest = ({ reason, detail }: { reason: string; detail: string }) => {
  // 화면 값만 받음(`__proto__` 같은 상속 속성 이름은 사유 없음)
  const serverReason = Object.hasOwn(SERVER_REASON, reason) ? SERVER_REASON[reason] : undefined;
  if (!serverReason) throw new Error('신고 사유가 올바르지 않습니다.');
  return {
    reason: serverReason,
    ...(serverReason === 'OTHER' && detail.trim() ? { detail: detail.trim() } : {}),
  };
};
