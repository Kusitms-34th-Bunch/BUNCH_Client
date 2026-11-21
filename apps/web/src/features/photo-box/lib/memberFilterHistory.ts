/** 사진함에서 고른 멤버 필터. 번치 id와 함께 둬 그사이 번치를 바꿨으면 쓰지 않음 */
export type MemberFilterSelection = { bunchId: string; memberId: string };

// 고른 필터를 이 화면의 history 항목에 둠: 사진 상세에서 뒤로 돌아오면 그 필터로, 새로 들어오면 「전체」로
const HISTORY_KEY = 'photoBoxMember';

export const readHistoryMemberFilter = (): MemberFilterSelection | undefined => {
  if (typeof window === 'undefined') return undefined;
  const state = window.history.state as Record<string, unknown> | null;
  const saved = state?.[HISTORY_KEY] as { bunchId?: unknown; memberId?: unknown } | undefined;
  return typeof saved?.bunchId === 'string' && typeof saved.memberId === 'string'
    ? { bunchId: saved.bunchId, memberId: saved.memberId }
    : undefined;
};

export const writeHistoryMemberFilter = (selection: MemberFilterSelection) => {
  const state = window.history.state as object | null;
  window.history.replaceState({ ...state, [HISTORY_KEY]: selection }, '');
};
