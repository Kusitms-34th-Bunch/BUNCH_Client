import { isNativeShell } from '@/shared/bridge/client';

/** 문서를 새로 불러오며 이동(메모리의 사용자 데이터까지 비움). 현재 기록 항목만 바꿔 그 앞의 기록은 남음 */
export const reloadTo = (path: string) => window.location.replace(path);

/**
 * 외부 주소 열기: 쉘은 같은 WebView 이동을 쉘이 가로채 앱(없으면 브라우저)으로 열고, 브라우저는 새 탭
 * https 주소만 열고 그 밖(javascript: 등)은 무시(쉘에서는 앱 출처에서 실행될 수 있음)
 */
export const openExternal = (url: string) => {
  if (!URL.canParse(url) || new URL(url).protocol !== 'https:') return;
  if (isNativeShell()) window.location.assign(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
};
