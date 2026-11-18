// 「번들 만들기」로 참여 멤버 고르기에 넘어갈 때 고른 사진(고른 순서)과 번치를 기억해, 거기서 뒤로 오면 선택 모드와 번호를 되살림(기능 spec 3.3.4)
// 메모리에만 두고, 되살릴 때 같은 번치인지·사진이 아직 있는지 확인하며, 사진함이 열리면 비우고 초안을 만들었거나 2분이 지난 값은 쓰지 않아
// 뒤로 가기가 아닌 다른 경로로 나갔다가 돌아와도 엉뚱한 선택 모드가 켜지지 않게 함
const RESUME_TTL_MS = 2 * 60_000;

export type RememberedSelection = { bunchId: string; photoIds: readonly string[] };

let remembered: (RememberedSelection & { at: number }) | undefined;

export const rememberPhotoBoxSelection = (bunchId: string, photoIds: readonly string[]) => {
  remembered = { bunchId, photoIds, at: Date.now() };
};

/** 되살릴 선택(읽어도 비우지 않음), 없거나 오래됐으면 undefined */
export const readPhotoBoxSelection = (): RememberedSelection | undefined =>
  remembered && Date.now() - remembered.at <= RESUME_TTL_MS
    ? { bunchId: remembered.bunchId, photoIds: remembered.photoIds }
    : undefined;

export const clearPhotoBoxSelection = () => {
  remembered = undefined;
};
