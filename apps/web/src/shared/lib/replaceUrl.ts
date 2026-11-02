/**
 * Next 이동 없이 주소 표시줄만 바꿈(새로고침·공유가 지금 보는 것을 가리키게)
 * `history.state`를 그대로 두는 것이 핵심: `null`을 넘기면 Next가 거기에 적어 둔 내부 값(뒤로 가기 복원용)이 지워짐
 * `extraState`는 같은 history 항목에 화면이 따로 적어 둘 값
 */
export const replaceUrl = (url: string, extraState?: Record<string, unknown>) => {
  window.history.replaceState(
    { ...(window.history.state as Record<string, unknown> | null), ...extraState },
    '',
    url,
  );
};
