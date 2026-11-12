import {
  MAX_SAVE_IMAGES,
  saveImagesToAlbumResultSchema,
  saveImageUrlsSchema,
  type SaveImagesToAlbumResult,
} from '@app/bridge';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import { deleteCacheFiles } from './cache-cleanup';

// 한 번에 내려받는 사진 수. 사진 한 장이 수 MB라 선택 모드 최대 50장을 한꺼번에 받지 않음
const SAVE_CONCURRENCY = 3;

// 앨범에 저장하기 전에 사진을 잠깐 두는 앱 캐시 폴더
const getTempDirectory = (): Directory => {
  const directory = new Directory(Paths.cache, 'album-save');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
};

// 한 장을 내려받아 앨범에 저장하고, 성공·실패와 관계없이 임시 파일은 바로 지움
const saveOne = async (url: string, directory: Directory): Promise<boolean> => {
  // 보관된 이미지는 업로드할 때 JPEG로 바꾼 것이라 확장자는 jpg로 고정(저장 API가 확장자를 요구함)
  const destination = new File(directory, `${randomUUID()}.jpg`);
  try {
    const file = await File.downloadFileAsync(url, destination, { idempotent: true });
    await MediaLibrary.saveToLibraryAsync(file.uri);
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[album] 사진을 저장하지 못했어요', error);
    return false;
  } finally {
    await deleteCacheFiles([destination.uri]);
  }
};

/**
 * 이미지 주소들을 내려받아 휴대폰 앨범에 저장(기능명세서 3.3.3·3.5.2). 사진 데이터는 웹으로 넘기지 않고 쉘 안에서만 다룸
 * 저장 권한만 요청하고(iOS는 사진 추가 권한, 앨범 전체 읽기 권한이 아님) 거부되어 있으면 팝업 없이 `denied`
 * 결과는 요청한 주소 순서대로 사진별 성공 여부. 한 장이 실패해도 나머지는 계속 저장
 */
export async function saveImagesToAlbum(urls: string[]): Promise<SaveImagesToAlbumResult> {
  const parsed = saveImageUrlsSchema.parse(urls);
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return { status: 'denied' };

  const directory = getTempDirectory();
  const results = new Array<boolean>(Math.min(parsed.length, MAX_SAVE_IMAGES));
  let next = 0;
  const run = async () => {
    while (next < parsed.length) {
      const index = next;
      next += 1;
      results[index] = await saveOne(parsed[index] as string, directory);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SAVE_CONCURRENCY, parsed.length) }, run));
  return saveImagesToAlbumResultSchema.parse({ status: 'saved', results });
}
