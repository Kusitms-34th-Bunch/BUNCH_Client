/**
 * 실시간(STOMP) 연결 주소와 사용 여부
 * 브라우저가 백엔드 `/ws`에 직접 연결하므로 공개 환경 변수(`NEXT_PUBLIC_WS_URL`, 예: `wss://api.example.com/ws`)를 쓰고
 * query string은 붙이지 않음(서버가 query가 있으면 연결을 400으로 거절). 토큰은 주소가 아니라 CONNECT 헤더로만 보냄
 * 토큰이 평문으로 지나지 않도록 `wss:`만 허용하고, `ws:`는 로컬 개발 주소(localhost·127.0.0.1)에만 허용함
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export const realtimeUrl = (): string | undefined => {
  const raw = process.env.NEXT_PUBLIC_WS_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    // 빈 query(?)·fragment(#)도 WebSocket 생성자가 거부하므로 원문에 구분자가 있으면 받지 않음
    if (raw.includes('?') || raw.includes('#')) return undefined;
    if (url.search !== '' || url.hash !== '') return undefined;
    // 주소에 계정 정보를 넣지 않음
    if (url.username !== '' || url.password !== '') return undefined;
    if (url.protocol === 'wss:') return raw;
    // 운영 빌드에서는 평문 연결을 쓰지 않음
    if (
      url.protocol === 'ws:' &&
      LOCAL_HOSTS.has(url.hostname) &&
      process.env.NODE_ENV !== 'production'
    )
      return raw;
    return undefined;
  } catch {
    return undefined;
  }
};

/** 가짜 서버(MSW) 모드에는 실시간 서버가 없어 연결하지 않음 */
export const isRealtimeEnabled = (): boolean =>
  realtimeUrl() !== undefined && process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled';
