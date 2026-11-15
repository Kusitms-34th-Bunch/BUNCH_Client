// 탈퇴 안내 ↔ 관리자 권한 넘기기 사이의 화면 흐름 표시(메모리, 새로고침하면 처음 상태)

// 권한을 넘기고 돌아왔는지(탈퇴 안내의 확인 체크를 유지, 기능명세서 7.6.1 로직 1)
let keepAgreed = false;
// 탈퇴 안내에서 들어왔는지(완료 뒤 뒤로 가기로 돌아갈지, 탈퇴 안내로 바로 갈지 판단)
let enteredFromGuide = false;

/** 권한을 모두 넘긴 직후 표시. 탈퇴 안내에서 체크하고 들어온 경우만 돌아가서 체크를 유지(주소로 바로 들어오면 유지 안 함) */
export const markKeepAgreed = (fromGuide: boolean) => {
  keepAgreed = fromGuide;
};

/** 탈퇴 안내가 처음 그릴 때 읽음. 렌더 중에는 바꾸지 않고 `clearKeepAgreed`로 effect에서 지움 */
export const peekKeepAgreed = () => keepAgreed;

export const clearKeepAgreed = () => {
  keepAgreed = false;
};

/** 탈퇴 안내의 「권한 넘기러 가기」가 이동 직전에 표시 */
export const markTransferFromGuide = () => {
  enteredFromGuide = true;
};

/** 권한 이전 화면이 들어올 때 한 번 읽고 지움 */
export const consumeTransferFromGuide = () => {
  const entered = enteredFromGuide;
  enteredFromGuide = false;
  return entered;
};
