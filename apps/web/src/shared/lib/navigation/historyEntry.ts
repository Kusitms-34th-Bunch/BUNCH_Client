// 지금 history 항목에 화면이 적어 두는 값(뒤로 돌아왔을 때 복원용)
// 쓸 때는 기존 state와 합침: Next가 같은 state에 적어 둔 내부 값(뒤로 가기 복원용)을 지우지 않게

const currentState = (): Record<string, unknown> => {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {};
};

/** 지금 항목에 적어 둔 값(없거나 서버 렌더면 undefined), 모양 확인은 호출하는 쪽이 함 */
export const readHistoryEntry = (key: string): unknown =>
  typeof window === 'undefined' ? undefined : currentState()[key];

/** 지금 항목에 값을 적음(같은 키는 덮어씀) */
export const writeHistoryEntry = (values: Record<string, unknown>) => {
  window.history.replaceState({ ...currentState(), ...values }, '');
};

/** 지금 항목에서 값을 지움(없으면 그대로) */
export const removeHistoryEntry = (key: string) => {
  const state = currentState();
  if (!(key in state)) return;
  const { [key]: _, ...rest } = state;
  window.history.replaceState(rest, '');
};
