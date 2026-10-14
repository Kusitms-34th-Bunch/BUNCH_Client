import { bridge, createWebView } from '@webview-bridge/react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, type ComponentRef } from 'react';
import { BackHandler, Button, Linking, Share, StyleSheet, Text, View } from 'react-native';
import { shareParamsSchema, type AppBridgeMethods } from '@app/bridge';
import * as Sentry from '@sentry/react-native';

// apps/web 배포 주소. .env.local 또는 EAS 환경변수로 넘긴다. 하드코딩하지 않는다.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

if (!WEB_URL) {
  throw new Error('EXPO_PUBLIC_WEB_URL이 설정되지 않았다. .env.local을 확인한다.');
}

// AppBridge(packages/bridge) 계약을 실제로 구현한다. 메서드를 추가하면
// packages/bridge의 AppBridge 타입과 schema도 함께 갱신한다.
// bridge()는 인라인 객체 리터럴을 받아야 index signature를 만족한다 — 미리 타입을
// 선언한 변수를 넘기면 TS2345(Bridge index signature 누락)가 난다.
const appBridge = bridge({
  share: async (params) => {
    const { url, title } = shareParamsSchema.parse(params);
    await Share.share({ message: title ? `${title}\n${url}` : url, url });
  },
} satisfies AppBridgeMethods);
const { WebView } = createWebView({ bridge: appBridge });

// http(s)는 WebView 안에서 그대로 연다(소셜 로그인 redirect 등이 깨지지 않게 한다).
// tel:, mailto: 같은 다른 scheme은 WebView가 처리하지 못하므로 OS에 넘긴다.
// ponytail: 허용 출처 allowlist는 인증 흐름이 정해진 뒤에 추가한다.
const isWebViewUrl = (url: string) => /^(https?|about):/i.test(url);

function App() {
  const webViewRef = useRef<ComponentRef<typeof WebView>>(null);
  const canGoBack = useRef(false);

  // Android 하드웨어 뒤로가기는 웹 history를 먼저 되돌리고, 더 갈 곳이 없으면 앱 기본 동작에 맡긴다.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        allowsBackForwardNavigationGestures
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
      <StatusBar style="auto" />
    </View>
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
