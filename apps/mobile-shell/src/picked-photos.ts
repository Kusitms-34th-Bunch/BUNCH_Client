/** 선택·촬영한 사진 한 장의 원본 위치와 크기. 사진 데이터는 들고 있지 않고 읽을 때 가공 */
export type PickedSource = { uri: string; width: number; height: number };

const sources = new Map<string, PickedSource>();
// 앱을 다시 켜도 이전 WebView가 남긴 id가 새 사진과 겹치지 않도록 실행마다 다른 접두사를 붙임
const sessionPrefix = Math.random().toString(36).slice(2, 8);
let nextId = 1;

/** 고른 사진을 보관하고 웹에 알려 줄 id를 돌려줌 */
export function registerPickedPhoto(source: PickedSource): string {
  const id = `photo-${sessionPrefix}-${nextId}`;
  nextId += 1;
  sources.set(id, source);
  return id;
}

/** 모르는 id(이미 놓아 준 사진 포함)는 오류 */
export function getPickedPhoto(id: string): PickedSource {
  const source = sources.get(id);
  if (!source) throw new Error('고른 사진을 찾을 수 없어요.');
  return source;
}

/** 업로드가 끝난 사진을 놓아 주고 놓은 사진을 돌려줌(임시 파일을 지우는 데 씀). ids를 생략하면 모두, 모르는 id는 무시 */
export function releasePickedPhotos(ids?: readonly string[]): PickedSource[] {
  const targets = ids ?? [...sources.keys()];
  const released: PickedSource[] = [];
  for (const id of targets) {
    const source = sources.get(id);
    if (!source) continue;
    sources.delete(id);
    released.push(source);
  }
  return released;
}

/** 보관 중인 사진 수(테스트용) */
export function pickedPhotoCount(): number {
  return sources.size;
}
