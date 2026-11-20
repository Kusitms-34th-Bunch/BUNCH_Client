import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppWebView, postMessage, WEB_URL } from '../web-view/AppWebView';
import { floatingButtonStore } from './floating-button-store';
import { NativeFloatingButton } from './NativeFloatingButton';
import { focusTabBar } from './tab-bar-visibility';
import { tabUrl, type TabId } from './tabs';
import { tabsStore } from './tabs-store';

/** 탭마다 WebView 하나. 탭 안의 SafeAreaProvider로 탭 바 높이를 포함한 아래 여백 측정 */
export function TabScreen({ id }: { id: TabId }) {
  const tabs = useSyncExternalStore(tabsStore.subscribe, tabsStore.get);
  const button = useSyncExternalStore(floatingButtonStore.subscribe, floatingButtonStore.get)[id];
  const path = tabs?.items.find((item) => item.id === id)?.path;
  // 탭이 바뀌면(탭 바 누름·웹의 selectNativeTab 모두) 그 탭이 마지막으로 알려 온 값으로 탭 바를 맞춤(#481)
  useFocusEffect(
    useCallback(() => {
      const current = tabsStore.get();
      const next = current && focusTabBar(current, id);
      if (next && next !== current) tabsStore.set(next);
    }, [id]),
  );
  if (!path) return null;

  return (
    <SafeAreaProvider>
      <View style={styles.screen}>
        <AppWebView
          uri={tabUrl(WEB_URL, path)}
          tabId={id}
          onLoadStart={() => floatingButtonStore.set(id, null)}
        />
        {button ? (
          <NativeFloatingButton
            button={button}
            onPress={() =>
              postMessage('nativeFloatingButtonPress', { tab: id }, { broadcast: true })
            }
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
