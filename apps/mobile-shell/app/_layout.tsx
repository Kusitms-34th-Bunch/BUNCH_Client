import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// 스플래시 자동 닫힘을 가장 먼저 막음(애니메이션 화면이 덮은 뒤 닫힘)
import '../src/splash/state';
import { SplashOverlay } from '../src/splash/SplashOverlay';

/** 첫 화면(WebView 하나, 로그인·온보딩)과 웹 요청 시 `(tabs)` 시스템 탭 화면 사이의 전환 틀 */
function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      {/* 앱·웹이 밝은 화면만 있어 어두운 아이콘 고정(auto는 Android 다크 모드에서 흰 아이콘이 흰 화면에 묻힘) */}
      <StatusBar style="dark" />
      {/* 웹 첫 페이지가 뜰 때까지 덮는 로고 애니메이션 */}
      <SplashOverlay />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
