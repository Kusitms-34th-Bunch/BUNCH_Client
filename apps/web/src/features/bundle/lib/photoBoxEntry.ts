// 사진함 선택 모드의 「번들 만들기」에서 참여 멤버 고르기로 넘어온 사진(메모리). 새로고침이나 직접 주소 진입이면 없음
// 이동이 취소돼 남은 값이 나중의 일반 진입에 쓰이지 않도록 짧은 시간만 유효하게 둠
const ENTRY_TTL_MS = 30_000;

let pending: { photoIds: readonly string[]; at: number } | undefined;

/** 사진함이 참여 멤버 고르기로 이동하기 직전에 고른 사진 id(고른 순서)를 넘김 */
export const startFromPhotoBox = (photoIds: readonly string[]) => {
  pending = { photoIds, at: Date.now() };
};

/** 사진함에서 넘어온 사진 id, 사진함을 거치지 않았거나 오래된 값이면 undefined */
export const readPhotoBoxEntry = (): readonly string[] | undefined =>
  pending && Date.now() - pending.at <= ENTRY_TTL_MS ? pending.photoIds : undefined;

export const clearPhotoBoxEntry = () => {
  pending = undefined;
};
