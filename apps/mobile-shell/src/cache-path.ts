// iOS는 같은 폴더를 `/private/var/...`와 `/var/...` 두 가지로 표기할 수 있어 비교 전에 하나로 맞춤
// (다르게 표기돼 폴더 안으로 인식하지 못하면 삭제가 조용히 건너뛰어져 위치가 든 복사본이 남음)
const normalize = (uri: string): string => {
  let value = uri;
  try {
    // `%2e%2e` 같은 인코딩된 `..`도 걸러 내려고 해석한 뒤 검사
    value = decodeURIComponent(uri);
  } catch {
    return '';
  }
  return value.replace(/^file:\/\/\/private\/var\//, 'file:///var/');
};

/**
 * uri가 지정한 폴더 안의 파일인지(폴더 자신이나 `..`로 벗어나는 경로는 아님)
 * 앱 캐시 밖의 파일(사용자의 앨범 원본 등)을 실수로 지우지 않도록 삭제 전에 확인하는 용도
 */
export function isInsideDirectory(uri: string, directoryUri: string): boolean {
  const target = normalize(uri);
  const directory = normalize(directoryUri);
  if (!target || !directory) return false;
  const base = directory.endsWith('/') ? directory : `${directory}/`;
  if (!target.startsWith(base) || target.length === base.length) return false;
  const segments = target.slice(base.length).split('/');
  return !segments.includes('..') && !segments.includes('.');
}
