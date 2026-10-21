import type { SetNativeTabBarParams } from '@app/bridge';

/** 시스템 탭 바의 탭은 `app/(tabs)/`의 화면 파일과 1:1이다. 웹이 보내는 항목 ID는 이 안에 있어야 한다 */
export const TAB_IDS = ['feed', 'photos', 'bunch', 'my'] as const;
export type TabId = (typeof TAB_IDS)[number];

export const isTabId = (id: string): id is TabId => (TAB_IDS as readonly string[]).includes(id);

/** 탭 화면이 여는 주소(웹 기본 주소 + 탭 경로) */
export const tabUrl = (webUrl: string, path: string) => new URL(path, webUrl).toString();

/**
 * 웹이 보낸 항목이 모두 쉘의 탭 화면에 대응하고, 선택 탭이 항목에 있고, 탭 경로가 앱 출처일 때만 받아들인다
 * 경로 검증은 bridge schema에도 있지만 탭 WebView가 다른 출처를 열면 bridge가 그 페이지에 붙으므로 쉘에서도 막는다
 */
export const canShowTabs = (params: SetNativeTabBarParams, webUrl: string) =>
  params.items.some((item) => item.id === params.selectedId) &&
  params.items.every(
    (item) =>
      isTabId(item.id) && new URL(tabUrl(webUrl, item.path)).origin === new URL(webUrl).origin,
  );
