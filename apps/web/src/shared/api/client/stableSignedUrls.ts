// 서버가 사진 주소를 요청마다 새로 서명해 같은 사진도 주소가 바뀜(다시 받을 때마다 깜빡이고 hero 사진이 빔, #573)
// 같은 파일이면 유효 시간이 절반 넘게 남은 이전 주소를 그대로 씀

// 서명 유효 시간 상한(S3 presigned 최대 7일). 넘는 값은 서명 주소로 보지 않음(사용자 입력의 가짜 주소가 오래 남지 않게)
const MAX_EXPIRES_S = 7 * 24 * 60 * 60;
// 가장 오래된 것부터 지우는 상한
const LIMIT = 1000;
// 받은 순간 기준 만료 시각(기기 시계가 서버와 달라도 어긋나지 않게)과 유효 시간
const kept = new Map<string, { url: string; expiresAt: number; lifetime: number }>();

// 서명 주소면 같은 파일을 가리키는 key와 유효 시간(초), 아니면 undefined
const parseSigned = (value: string) => {
  if (!value.includes('X-Amz-Signature')) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  const expires = Number(url.searchParams.get('X-Amz-Expires'));
  if (!url.searchParams.get('X-Amz-Date') || !(expires > 0) || expires > MAX_EXPIRES_S) {
    return undefined;
  }
  // 서명 값을 뺀 나머지 쿼리(크기·내려받기 이름 등)는 다른 파일로 구분
  const rest = [...url.searchParams].filter(([name]) => !name.startsWith('X-Amz-'));
  return { key: `${url.origin}${url.pathname}?${new URLSearchParams(rest).toString()}`, expires };
};

const stableUrl = (value: string, now: number) => {
  const signed = parseSigned(value);
  if (!signed) return value;
  const { key, expires } = signed;
  const previous = kept.get(key);
  if (previous && previous.expiresAt - now > previous.lifetime / 2) return previous.url;
  kept.delete(key);
  if (kept.size >= LIMIT) kept.delete(kept.keys().next().value!);
  kept.set(key, { url: value, expiresAt: now + expires * 1000, lifetime: expires * 1000 });
  return value;
};

/**
 * 불러오지 못한 서명 주소를 재사용 목록에서 뺌(다시 받은 응답의 새 주소를 쓰게, #587)
 * 같은 파일을 가리키는 key를 돌려줌(서명 주소가 아니면 undefined)
 */
export const forgetSignedUrl = (value: string) => {
  const key = parseSigned(value)?.key;
  if (key && kept.get(key)?.url === value) kept.delete(key);
  return key;
};

/** 응답 JSON 안의 서명 사진 주소를 같은 파일의 이전 주소로 맞춤(나머지 값은 그대로) */
export const stableSignedUrls = <T>(value: T, now = Date.now()): T => {
  if (typeof value === 'string') return stableUrl(value, now) as T;
  if (Array.isArray(value)) return value.map((item: unknown) => stableSignedUrls(item, now)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, stableSignedUrls(item, now)]),
    ) as T;
  }
  return value;
};
