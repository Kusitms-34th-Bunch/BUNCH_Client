import { isSavableImageUrl } from '@app/bridge';
import { isNativeShell, photoUploadBridge } from '@/shared/bridge/client';
import type { SaveResult } from '../lib/types';
import { runPool, UPLOAD_CONCURRENCY } from '../lib/photoUpload';
import { getPhotoDetail } from './photos';

// 원본 주소가 같은 출처 경로(목 서버)면 쉘이 내려받을 수 있게 절대 주소로 바꿈
const toAbsoluteUrl = (src: string): string => new URL(src, window.location.origin).href;

/**
 * 고른 사진들을 휴대폰 앨범에 저장(기능명세서 3.3.3·3.5.2): 사진마다 상세 API에서 원본 이미지 주소를 받아 쉘에 넘기면
 * 쉘이 내려받아 저장함(사진 데이터는 웹을 거치지 않음). 원본 주소를 받지 못했거나 쉘이 받지 않는 주소(공개 https가 아님)인 사진은
 * 쉘에 넘기지 않고 저장하지 못한 사진으로 셈(주소 하나 때문에 묶음 전체가 거절되지 않게 웹에서 먼저 거름)
 * 쉘이 없거나 저장 기능이 없는 이전 쉘이면 요청하지 않고 이유만 돌려주고, 저장 권한이 거부되어 있으면 `denied`
 */
export const saveToAlbum = async (
  bunchId: string,
  photoIds: readonly string[],
): Promise<SaveResult> => {
  if (!isNativeShell()) return { savedIds: [], failedIds: photoIds, blocked: 'unavailable' };
  if (!photoUploadBridge.isNativeMethodAvailable('saveImagesToAlbum')) {
    return { savedIds: [], failedIds: photoIds, blocked: 'outdated' };
  }

  const sources = await runPool(photoIds, UPLOAD_CONCURRENCY, async (id) => {
    try {
      const { imageSrc } = await getPhotoDetail(bunchId, id);
      const url = toAbsoluteUrl(imageSrc);
      return { id, url: isSavableImageUrl(url) ? url : null };
    } catch {
      return { id, url: null };
    }
  });
  const ready: { id: string; url: string }[] = [];
  const unresolved: string[] = [];
  for (const source of sources) {
    if (source.url === null) unresolved.push(source.id);
    else ready.push({ id: source.id, url: source.url });
  }
  if (ready.length === 0) return { savedIds: [], failedIds: photoIds };

  const result = await photoUploadBridge.saveImagesToAlbum(ready.map((source) => source.url));
  if (result.status === 'denied') return { savedIds: [], failedIds: photoIds, blocked: 'denied' };
  // 결과 길이가 요청과 다르면 어느 사진의 결과인지 알 수 없어 모두 저장하지 못한 것으로 봄
  if (result.results.length !== ready.length) return { savedIds: [], failedIds: photoIds };

  const saved = ready.filter((_, index) => result.results[index] === true);
  const failed = ready.filter((_, index) => result.results[index] !== true);
  return {
    savedIds: saved.map((source) => source.id),
    failedIds: [...unresolved, ...failed.map((source) => source.id)],
  };
};
