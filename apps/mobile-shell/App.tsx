import { bridge, createWebView } from '@webview-bridge/react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useSyncExternalStore, type ComponentRef } from 'react';
import {
  BackHandler,
  Button,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  appPostMessageSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
  type AppBridgeMethods,
} from '@app/bridge';
import * as Sentry from '@sentry/react-native';
import { NativeTabBar } from './src/native-tab-bar/NativeTabBar';
import {
  buildTabBarInsetScript,
  getTabBarLayout,
  shouldUseNativeTabBar,
} from './src/native-tab-bar/native-tab-bar';
import { nativeTabBarStore } from './src/native-tab-bar/native-tab-bar-store';
import { buildSafeAreaScript } from './src/safe-area-script';

// .env.local 또는 EAS 환경변수로 웹 배포 주소 설정
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

if (!WEB_URL) {
  throw new Error('EXPO_PUBLIC_WEB_URL이 설정되지 않았다. .env.local을 확인한다.');
}

// bridge의 index signature 충족을 위해 인라인 객체 리터럴 사용
const appBridge = bridge({
  share: async (params) => {
    const { url, title } = shareParamsSchema.parse(params);
    await Share.share({ message: title ? `${title}\n${url}` : url, url });
  },
  // 지원하지 않는 환경에서는 웹 탭 막대 사용
  setNativeTabBar: (params) => {
    if (!shouldUseNativeTabBar(Platform.OS, isLiquidGlassAvailable())) {
      return Promise.resolve(false);
    }
    nativeTabBarStore.set(setNativeTabBarParamsSchema.parse(params));
    return Promise.resolve(true);
  },
} satisfies AppBridgeMethods);
const { WebView, postMessage } = createWebView({
  bridge: appBridge,
  postMessageSchema: appPostMessageSchema,
});

// 소셜 로그인 redirect 유지를 위해 웹 URL은 WebView, 나머지 scheme은 OS에서 처리
// shortcut: 웹 출처 제한 없음, 인증 흐름 확정 시 allowlist 적용
const isWebViewUrl = (url: string) => /^(https?|about):/i.test(url);

function Shell() {
  // Safe Area: 네이티브 측정값을 웹 CSS 변수로 전달(적용은 웹의 AppFrame 담당)
  const insets = useSafeAreaInsets();
  const safeAreaScript = buildSafeAreaScript(insets);
  const tabBar = useSyncExternalStore(nativeTabBarStore.subscribe, nativeTabBarStore.get);
  const isTabBarVisible = tabBar !== null && !tabBar.hidden;
  const tabBarInsetScript = buildTabBarInsetScript(
    isTabBarVisible ? getTabBarLayout(insets.bottom).inset : 0,
  );
  const webViewRef = useRef<ComponentRef<typeof WebView>>(null);
  const canGoBack = useRef(false);

  // Android 뒤로가기 시 웹 history 우선 처리
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  // 값 변경 시(예: 기기 회전) 재주입 — 첫 로드는 injectedJavaScriptBeforeContentLoaded 담당
  useEffect(() => {
    webViewRef.current?.injectJavaScript(safeAreaScript);
  }, [safeAreaScript]);

  // 막대가 차지하는 높이를 웹 CSS 변수로 전달(막대가 바뀔 때마다, 그리고 새 문서를 로드한 뒤)
  useEffect(() => {
    webViewRef.current?.injectJavaScript(tabBarInsetScript);
  }, [tabBarInsetScript]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={safeAreaScript}
        // WebView 자체 inset 보정 해제(웹이 여백을 적용하므로 이중 적용 방지)
        contentInsetAdjustmentBehavior="never"
        allowsBackForwardNavigationGestures
        // 이전 문서의 탭 막대 잔존 방지
        onLoadStart={() => nativeTabBarStore.set(null)}
        onLoadEnd={() => webViewRef.current?.injectJavaScript(tabBarInsetScript)}
        onNavigationStateChange={(navState) => {
          canGoBack.current = navState.canGoBack;
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (isWebViewUrl(request.url)) return true;
          Linking.openURL(request.url).catch(() => {});
          return false;
        }}
        renderError={() => (
          <View style={styles.error}>
            <Text style={styles.errorText}>
              화면을 불러오지 못했어요.{'\n'}네트워크를 확인해 주세요.
            </Text>
            <Button title="다시 시도" onPress={() => webViewRef.current?.reload()} />
          </View>
        )}
      />
      {isTabBarVisible ? (
        <NativeTabBar
          items={tabBar.items}
          selectedId={tabBar.selectedId}
          bottomInset={insets.bottom}
          onPress={(id) => postMessage('nativeTabPress', { id })}
        />
      ) : null}
      <StatusBar style="auto" />
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
  },
});
