import { File, Paths } from 'expo-file-system';
import { isInsideDirectory } from './cache-path';

/**
 * 선택기·이미지 가공이 앱 캐시에 만든 임시 파일을 지움
 * 선택기가 만든 복사본에는 위치가 들어 있을 수 있어, 업로드가 끝나면 OS가 캐시를 비울 때까지 두지 않고 바로 지움
 * 앱 캐시 폴더 밖의 파일은 지우지 않고(사용자의 앨범 원본 보호), 지우지 못해도 업로드 흐름은 막지 않음
 */
export function deleteCacheFiles(uris: readonly string[]): Promise<void> {
  const cacheUri = Paths.cache.uri;
  for (const uri of uris) {
    if (!isInsideDirectory(uri, cacheUri)) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (error) {
      if (__DEV__) console.warn('[cache] 임시 파일을 지우지 못했어요', error);
    }
  }
  return Promise.resolve();
}
