const MINUTE = 60_000;

/**
 * 경과 시간 글자(피드 발행 시각 기능명세서 6.1.3, 번치 알림 시각): 1분 미만 「방금 전」, 「N분 전」, 「N시간 전」, 7일까지 「N일 전」, 8일부터 「YYYY년 M월 D일」
 * 일 수는 지난 시간을 24시간 단위로 셈(달력 날짜 기준이 아님, 확인 항목). 날짜는 기기 시간대
 */
export function formatElapsedTime(at: string, now: number = Date.now()) {
  const date = new Date(at);
  const minutes = Math.floor((now - date.getTime()) / MINUTE);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}일 전`;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}
