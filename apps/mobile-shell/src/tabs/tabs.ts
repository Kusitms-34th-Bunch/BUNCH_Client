import type { SetNativeTabBarParams } from '@app/bridge';

/** `app/(tabs)/` 화면 파일과 1:1인 탭 ID(웹이 보내는 항목 ID의 허용 범위) */
export const TAB_IDS = ['feed', 'photos', 'bunch', 'my'] as const;
export type TabId = (typeof TAB_IDS)[number];

export const isTabId = (id: string): id is TabId => (TAB_IDS as readonly string[]).includes(id);

/** 탭 화면이 여는 주소(웹 기본 주소 + 탭 경로) */
export const tabUrl = (webUrl: string, path: string) => new URL(path, webUrl).toString();

/**
 * 탭 요청 수락 조건: 모든 항목이 쉘의 탭 ID, 선택 탭이 항목에 포함, 탭 경로가 앱 출처
 * 경로는 bridge schema에서도 검증하지만 다른 출처를 연 탭 WebView에 bridge가 붙는 것을 막기 위해 쉘에서 재확인
 */
export const canShowTabs = (params: SetNativeTabBarParams, webUrl: string) =>
  params.items.some((item) => item.id === params.selectedId) &&
  params.items.every(
    (item) =>
      isTabId(item.id) && new URL(tabUrl(webUrl, item.path)).origin === new URL(webUrl).origin,
  );
