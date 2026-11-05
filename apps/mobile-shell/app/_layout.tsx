import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** 첫 화면(WebView 하나, 로그인·온보딩)과 웹 요청 시 `(tabs)` 시스템 탭 화면 사이의 전환 틀 */
function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
