// 초대 링크로 들어온 사용자가 로그인·가입을 마칠 때까지 초대 정보를 들고 있기 위한 보관소(기능명세 1.5.1)
// 로그인은 화면을 새로 불러오는 이동이 있어 메모리만으로는 유지되지 않으므로 WebView 저장소를 씀(앱 데이터라 앱을 지우면 함께 지워짐)
// 초대 입력(토큰)은 로그·URL·오류 수집으로 보내지 않고 이 모듈 밖으로는 `readPendingInvitation()`으로만 읽음
const KEY = 'bunch:pending-invitation';
/** 초대 정보는 최대 24시간 보관 */
export const PENDING_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

type Stored = { invitation: string; savedAt: number };

// 저장소를 쓸 수 없어도(비공개 모드·용량 초과) 이번 실행 안에서는 흐름이 이어지게 메모리에도 둠
let memory: Stored | null = null;

const parse = (raw: string | null): Stored | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'invitation' in value &&
      typeof value.invitation === 'string' &&
      'savedAt' in value &&
      typeof value.savedAt === 'number'
    ) {
      return { invitation: value.invitation, savedAt: value.savedAt };
    }
  } catch {
    // 깨진 값은 없는 것으로 취급
  }
  return null;
};

const load = (): Stored | null => {
  try {
    return parse(window.localStorage.getItem(KEY)) ?? memory;
  } catch {
    return memory;
  }
};

/**
 * 초대 정보를 보관. 가장 최근에 들어온 초대 하나만 남기고 이전 것은 덮어씀(기능명세 1.5.1)
 * 보관 시각이 24시간을 넘으면 읽을 때 없는 것으로 취급하고 지움
 */
export function savePendingInvitation(invitation: string, now = Date.now()) {
  const stored: Stored = { invitation, savedAt: now };
  memory = stored;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // 저장하지 못해도 이번 실행에서는 메모리 값으로 이어짐
  }
}

/** 보관된 초대 입력(링크 토큰). 없거나 24시간이 지났으면 null(지난 값은 함께 지움) */
export function readPendingInvitation(now = Date.now()): string | null {
  const stored = load();
  if (!stored) return null;
  if (now - stored.savedAt >= PENDING_INVITATION_TTL_MS || now < stored.savedAt) {
    clearPendingInvitation();
    return null;
  }
  return stored.invitation;
}

/** 보관한 초대 정보를 지움. 참여를 마쳤거나 그만두었을 때, 로그아웃할 때(기능명세 1.5.1) */
export function clearPendingInvitation() {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 지우지 못해도 메모리 값은 이미 지웠고 저장된 값은 24시간 뒤 만료됨
  }
}
