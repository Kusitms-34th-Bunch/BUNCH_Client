import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** 첫 화면은 하나의 WebView(로그인·온보딩), 웹이 탭을 요청하면 `(tabs)`의 시스템 탭 화면으로 바꾼다 */
function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
