import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// 스플래시 자동 닫힘을 가장 먼저 막음(애니메이션 화면이 덮은 뒤 닫힘)
import '../src/splash/state';
import { listenPushOpens } from '../src/push-open';
import { SplashOverlay } from '../src/splash/SplashOverlay';
import { postMessage } from '../src/web-view/AppWebView';

/** 첫 화면(WebView 하나, 로그인·온보딩)과 웹 요청 시 `(tabs)` 시스템 탭 화면 사이의 전환 틀 */
function RootLayout() {
  // 푸시를 눌러 앱을 열면 모든 WebView에 알리고, 화면에 보이는 WebView의 웹이 가져가 그 알림 화면으로 이동
  useEffect(() => listenPushOpens(() => postMessage('pushOpened', {}, { broadcast: true })), []);
  return (
    <SafeAreaProvider>
      {/* 기본은 어두운 아이콘(웹 화면이 밝음). 스플래시·로그인 배경 영상이 나중에 붙어 흰 아이콘으로 덮어씀 */}
      <StatusBar style="dark" />
      {/* 웹 첫 페이지가 뜰 때까지 화면을 덮는 로고 애니메이션 */}
      <SplashOverlay>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </SplashOverlay>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
