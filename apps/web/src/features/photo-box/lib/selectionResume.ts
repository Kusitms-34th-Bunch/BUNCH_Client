// 「번들 만들기」로 참여 멤버 고르기에 넘어갈 때 고른 사진(고른 순서)을 기억해, 거기서 뒤로 오면 선택 모드와 번호를 되살림(기능 spec 3.3.4)
// 메모리에만 두고 한 번 읽으면 비우며, 초안을 만들었거나 오래 지난 값은 쓰지 않아 다음 방문에 선택 모드가 남지 않게 함
const RESUME_TTL_MS = 10 * 60_000;

let remembered: { photoIds: readonly string[]; at: number } | undefined;

export const rememberPhotoBoxSelection = (photoIds: readonly string[]) => {
  remembered = { photoIds, at: Date.now() };
};

/** 되살릴 선택, 없거나 오래됐으면 undefined */
export const readPhotoBoxSelection = (): readonly string[] | undefined =>
  remembered && Date.now() - remembered.at <= RESUME_TTL_MS ? remembered.photoIds : undefined;

export const clearPhotoBoxSelection = () => {
  remembered = undefined;
};
