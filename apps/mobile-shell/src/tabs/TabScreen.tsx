import { useSyncExternalStore } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppWebView, WEB_URL } from '../web-view/AppWebView';
import { tabUrl, type TabId } from './tabs';
import { tabsStore } from './tabs-store';

/** 탭마다 WebView 하나. 탭 안의 SafeAreaProvider로 탭 바 높이를 포함한 아래 여백 측정 */
export function TabScreen({ id }: { id: TabId }) {
  const tabs = useSyncExternalStore(tabsStore.subscribe, tabsStore.get);
  const path = tabs?.items.find((item) => item.id === id)?.path;
  if (!path) return null;

  return (
    <SafeAreaProvider>
      <AppWebView uri={tabUrl(WEB_URL, path)} />
    </SafeAreaProvider>
  );
}
