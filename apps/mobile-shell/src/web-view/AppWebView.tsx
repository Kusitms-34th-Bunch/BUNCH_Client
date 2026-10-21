import { bridge, createWebView } from '@webview-bridge/react-native';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  appPostMessageSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
  type AppBridgeMethods,
} from '@app/bridge';
import { pickGalleryImage } from '../gallery-image';
import { requestPermission } from '../permissions';
import { buildSafeAreaScript } from '../safe-area-script';
import { canShowTabs } from '../tabs/tabs';
import { tabsStore } from '../tabs/tabs-store';
import { isAppWebUrl, resolveWebUrl } from '../web-url';

// `process.env.EXPO_PUBLIC_*` 직접 접근 유지(Metro는 이렇게 쓴 곳만 번들에 포함)
export const WEB_URL = resolveWebUrl(
  __DEV__,
  // Release 번들에 개발 주소 인라인 방지
  __DEV__ ? process.env.EXPO_PUBLIC_DEV_WEB_URL : undefined,
  process.env.EXPO_PUBLIC_WEB_URL,
);

// bridge의 index signature 충족을 위해 인라인 객체 리터럴 사용
const appBridge = bridge({
  pickGalleryImage,
  requestPermission,
  share: async (params) => {
    const { url, title } = shareParamsSchema.parse(params);
    await Share.share({ message: title ? `${title}\n${url}` : url, url });
  },
  // 시스템 탭 바는 iOS만 지원(그 외는 false 반환으로 웹 탭 막대 사용)
  setNativeTabBar: (params) => {
    if (Platform.OS !== 'ios') return Promise.resolve(false);
    const next = setNativeTabBarParamsSchema.parse(params);
    if (next.hidden) {
      if (tabsStore.get()) {
        // 화면 이동 뒤 비움(탭이 모두 숨은 막대가 한 프레임 보이는 것 방지)
        router.replace('/');
        tabsStore.set(null);
      }
      return Promise.resolve(true);
    }
    if (!canShowTabs(next, WEB_URL)) return Promise.resolve(false);
    // 이미 탭 화면이면 탭 WebView 4개의 같은 요청에 화면 이동 생략, 항목이 같으면 다시 그리기 생략
    const current = tabsStore.get();
    if (!current) {
      tabsStore.set(next);
      router.replace(`/${next.selectedId}` as Href);
    } else if (JSON.stringify(current.items) !== JSON.stringify(next.items)) {
      tabsStore.set(next);
    }
    return Promise.resolve(true);
  },
} satisfies AppBridgeMethods);

const { WebView } = createWebView({
  bridge: appBridge,
  postMessageSchema: appPostMessageSchema,
});

/** 쉘의 모든 화면이 쓰는 WebView. 출처 제한·Safe Area·뒤로가기·오류 화면 설정 포함 */
export function AppWebView({ uri }: { uri: string }) {
  // 탭 화면에서는 가장 가까운 SafeAreaProvider의 값(탭 바 높이 포함) 사용
  const insets = useSafeAreaInsets();
  const safeAreaScript = buildSafeAreaScript(insets);
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

  return (
    <WebView
      ref={webViewRef}
      source={{ uri }}
      style={styles.webview}
      injectedJavaScriptBeforeContentLoaded={safeAreaScript}
      // WebView 자체 inset 보정 해제(웹이 여백을 적용하므로 이중 적용 방지)
      contentInsetAdjustmentBehavior="never"
      allowsBackForwardNavigationGestures
      onNavigationStateChange={(navState) => {
        canGoBack.current = navState.canGoBack;
      }}
      onShouldStartLoadWithRequest={(request) => {
        // 외부 페이지의 네이티브 브리지 접근 방지를 위해 앱 출처만 내부 이동 허용
        if (isAppWebUrl(request.url, WEB_URL)) return true;
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
  );
}

const styles = StyleSheet.create({
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
