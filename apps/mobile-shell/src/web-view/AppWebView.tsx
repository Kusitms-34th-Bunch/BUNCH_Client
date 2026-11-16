import { bridge, createWebView } from '@webview-bridge/react-native';
import * as Haptics from 'expo-haptics';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
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
  setNativeFloatingButtonParamsSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
  type AppBridgeMethods,
} from '@app/bridge';
import { saveImagesToAlbum } from '../album-save';
import { copyToClipboard, readClipboard } from '../clipboard';
import { pickGalleryImage } from '../gallery-image';
import {
  capturePhoto,
  pickGalleryImages,
  readPickedPhoto,
  releasePickedPhotos,
} from '../gallery-upload';
import { getPermissionStatus, openAppSettings, requestPermission } from '../permissions';
import { getPushDeviceRegistration, getPushInstallationId } from '../push-device';
import { buildSafeAreaScript } from '../safe-area-script';
import { socialLogin } from '../social-login';
import { markWebReady } from '../splash/state';
import { floatingButtonStore } from '../tabs/floating-button-store';
import { canShowTabs, isTabId, type TabId } from '../tabs/tabs';
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
  pickGalleryImages,
  capturePhoto,
  readPickedPhoto,
  releasePickedPhotos,
  saveImagesToAlbum,
  openAppSettings,
  requestPermission,
  getPermissionStatus,
  getPushDeviceRegistration,
  getPushInstallationId,
  copyToClipboard,
  readClipboard,
  socialLogin,
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
        floatingButtonStore.clear();
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
      // 탭 바 표시 여부는 화면에 보이는 WebView의 setNativeTabBarVisible만 바꿈(다른 탭 WebView가 다시 불러와도 유지)
      tabsStore.set({ ...next, barHidden: current.barHidden });
    }
    return Promise.resolve(true);
  },
  // 탭 밖 화면을 같은 탭 WebView에서 여는 동안 탭 바만 숨김(탭 상태 유지, 결정 기록 012). 웹은 화면에 보이는 WebView만 보냄
  setNativeTabBarVisible: (visible) => {
    const current = tabsStore.get();
    if (Platform.OS !== 'ios' || !current || typeof visible !== 'boolean')
      return Promise.resolve(false);
    if (current.barHidden === !visible) return Promise.resolve(true);
    tabsStore.set({ ...current, barHidden: !visible });
    return Promise.resolve(true);
  },
  // iOS 26 이상 탭 화면에서만 네이티브 Liquid Glass 버튼(그 밖은 false로 웹 버튼 유지). 지우기는 항상 받음
  setNativeFloatingButton: (params) => {
    const { tab, button } = setNativeFloatingButtonParamsSchema.parse(params);
    if (!isTabId(tab)) return Promise.resolve(false);
    if (!button) {
      floatingButtonStore.set(tab, null);
      return Promise.resolve(true);
    }
    if (Platform.OS !== 'ios' || !isLiquidGlassAvailable() || !tabsStore.get())
      return Promise.resolve(false);
    floatingButtonStore.set(tab, button);
    return Promise.resolve(true);
  },
  // 안드로이드 시스템 햅틱(기기 햅틱 설정을 따름). iOS는 시스템 탭 바가 아니면 쓰이지 않아 선택 햅틱으로 대체
  // 웹이 도착 화면을 그리면 스플래시 마무리(여러 WebView가 보내도 한 번만)
  appReady: async () => markWebReady(),
  tabSelectionHaptic: () =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync(),
  // 사진을 길게 눌러 집어 올린 순간(끌기 시작): 안드로이드는 시스템 끌기 시작 햅틱(지원하지 않는 기기는 길게 누르기 햅틱), iOS는 중간 세기 충격
  dragStartHaptic: async () => {
    if (Platform.OS !== 'android') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Drag_Start)
      .catch(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press))
      // 햅틱은 보조 효과라 두 방법이 모두 실패해도 웹에 오류를 올리지 않음
      .catch(() => undefined);
  },
} satisfies AppBridgeMethods);

// postMessage: 네이티브 → 웹 이벤트(탭 WebView 여러 개라 broadcast로 보내고 웹이 대상 확인)
export const { WebView, postMessage } = createWebView({
  bridge: appBridge,
  postMessageSchema: appPostMessageSchema,
});

/** 쉘의 모든 화면이 쓰는 WebView. 출처 제한·Safe Area·뒤로가기·오류 화면 설정 포함 */
// 다른 탭의 경로를 연 WebView가 그 탭의 네이티브 버튼을 건드리지 않게 탭 ID를 알려 줌
// WebView마다 따로이고 hydration에 지워지지 않는 sessionStorage로 전달
const buildShellTabScript = (tabId: TabId) =>
  `try{sessionStorage.setItem('bunch-shell-tab',${JSON.stringify(tabId)});}catch(e){}`;

type AppWebViewProps = {
  uri: string;
  /** 탭 화면의 WebView면 그 탭 ID(웹이 sessionStorage `bunch-shell-tab`으로 자기 탭을 앎) */
  tabId?: TabId;
  onLoadStart?: () => void;
};

export function AppWebView({ uri, tabId, onLoadStart }: AppWebViewProps) {
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
      injectedJavaScriptBeforeContentLoaded={
        tabId ? `${buildShellTabScript(tabId)}${safeAreaScript}` : safeAreaScript
      }
      // WebView 자체 inset 보정 해제(웹이 여백을 적용하므로 이중 적용 방지)
      contentInsetAdjustmentBehavior="never"
      // 스크롤은 웹 화면 안쪽 영역(PageShell main)이 맡으므로 문서 전체가 당겨지며 바깥 흰 배경이 드러나지 않게
      bounces={false}
      overScrollMode="never"
      // 링크를 꾹 눌렀을 때 뜨는 브라우저 미리보기(Open Link·Copy Link·Share)를 막아 앱처럼 보이게
      allowsLinkPreview={false}
      allowsBackForwardNavigationGestures
      // 로그인 배경 영상(muted·playsInline·autoPlay)이 자동으로 화면 안에서 재생되게. 기본값이면 멈춘 첫 프레임과 재생 버튼만 보임
      // iOS 기본값(false)에서는 <video playsInline>이 무시되고, 두 설정 모두 이 WebView가 여는 모든 앱 출처 페이지에 적용됨(전역). 소리 있는 영상을 넣을 때 자동 재생 여부를 함께 고려
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      // 스플래시는 웹의 appReady(도착 화면 결정)로 닫음. 페이지를 못 불러오면 오류 화면이 보이게 바로 닫음
      // 새 문서를 열면 이전 문서가 남긴 네이티브 UI(플로팅 버튼) 정리
      onLoadStart={onLoadStart}
      onError={markWebReady}
      onHttpError={markWebReady}
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
