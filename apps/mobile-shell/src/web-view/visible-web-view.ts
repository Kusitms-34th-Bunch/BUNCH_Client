import { createFloatingButtonGuard } from '../tabs/floating-button-guard';
import { floatingButtonStore } from '../tabs/floating-button-store';
import { visibleTab } from '../tabs/tab-bar-visibility';
import { isTabId, isTabRootUrl, type TabId } from '../tabs/tabs';
import { tabsStore } from '../tabs/tabs-store';

// 플로팅 버튼은 그 탭이 첫 화면일 때만 그림(src/tabs/floating-button-guard.ts). 탭 경로를 모르면 첫 화면으로 봄
export const floatingButtons = createFloatingButtonGuard({
  isRoot: (tab, url) => {
    const path = tabsStore.get()?.items.find((item) => item.id === tab)?.path;
    return !path || isTabRootUrl(url, path);
  },
  show: floatingButtonStore.set,
});

/** 지금 화면에 보이는 WebView인지: 탭 화면이면 지금 보이는 탭의 WebView, 아니면 첫 화면 WebView */
export const isVisibleWebView = (tabId: TabId | undefined) => {
  const tabs = tabsStore.get();
  if (!tabId) return !tabs;
  if (!tabs) return false;
  const initial = isTabId(tabs.selectedId) ? tabs.selectedId : tabId;
  return visibleTab(tabs, initial) === tabId;
};
