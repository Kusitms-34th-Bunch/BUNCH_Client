import { bridge, createWebView } from '@webview-bridge/react-native';
import * as Haptics from 'expo-haptics';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
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
  hapticKindSchema,
  hideNativeToastParamsSchema,
  nativeTabBarVisibilitySchema,
  nativeTabEventSchema,
  setNativeFloatingButtonParamsSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
  showNativeToastParamsSchema,
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
import { incomingLinkStore } from '../incoming-link-store';
import { loginBackgroundStore } from '../login-background/login-background-store';
import { getPermissionStatus, openAppSettings, requestPermission } from '../permissions';
import { getPushDeviceRegistration, getPushInstallationId } from '../push-device';
import { buildSafeAreaScript } from '../safe-area-script';
import { authorizeApple, socialLogin } from '../social-login';
import {
  forceWebReady,
  markTabWebViewLoading,
  markWebReady,
  waitForTabWebView,
} from '../splash/state';
import { floatingButtonStore } from '../tabs/floating-button-store';
import { reportTabBar, visibleTab } from '../tabs/tab-bar-visibility';
import { canShowTabs, isTabId, type TabId } from '../tabs/tabs';
import { tabsStore } from '../tabs/tabs-store';
import { toastStore } from '../toast/toast-store';
import { blocksBackNavigation, isAppWebUrl, resolveWebUrl } from '../web-url';

// `process.env.EXPO_PUBLIC_*` 직접 접근 유지(Metro는 이렇게 쓴 곳만 번들에 포함)
export const WEB_URL = resolveWebUrl(
  __DEV__,
  // Release 번들에 개발 주소 인라인 방지
  __DEV__ ? process.env.EXPO_PUBLIC_DEV_WEB_URL : undefined,
  process.env.EXPO_PUBLIC_WEB_URL,
  // E2E 전용 빌드만(같은 기기에 띄운 가짜 서버 웹을 http로 열기 위함, 결정 기록 029)
  process.env.EXPO_PUBLIC_E2E === '1',
);

/** 웹 경로(`/invite/{토큰}` 등)를 이 앱이 여는 웹 주소로(개발 빌드는 개발 서버) */
export const toAppWebUrl = (path: string) => new URL(path, WEB_URL).href;

/** 지금 화면에 보이는 WebView인지: 탭 화면이면 지금 보이는 탭의 WebView, 아니면 첫 화면 WebView */
const isVisibleWebView = (tabId: TabId | undefined) => {
  const tabs = tabsStore.get();
  if (!tabId) return !tabs;
  if (!tabs) return false;
  const initial = isTabId(tabs.selectedId) ? tabs.selectedId : tabId;
  return visibleTab(tabs, initial) === tabId;
};

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
  authorizeApple,
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
        toastStore.clear();
      }
      return Promise.resolve(true);
    }
    if (!canShowTabs(next, WEB_URL)) return Promise.resolve(false);
    // 이미 탭 화면이면 탭 WebView 4개의 같은 요청에 화면 이동 생략, 항목이 같으면 다시 그리기 생략
    const current = tabsStore.get();
    if (!current) {
      // 이 요청을 보낸 첫 화면 WebView는 곧 버려지므로 스플래시는 탭 WebView의 appReady로 닫음
      waitForTabWebView();
      tabsStore.set(next);
      router.replace(`/${next.selectedId}` as Href);
    } else if (JSON.stringify(current.items) !== JSON.stringify(next.items)) {
      // 탭 바 표시 상태(탭별 값·선택 탭)는 그대로 둠(다른 탭 WebView가 다시 불러와도 유지)
      tabsStore.set({
        ...next,
        barHidden: current.barHidden,
        hiddenByTab: current.hiddenByTab,
        focusedTab: current.focusedTab,
      });
    }
    return Promise.resolve(true);
  },
  // 탭 밖 화면을 같은 탭 WebView에서 여는 동안 탭 바만 숨김(탭 상태 유지, 결정 기록 012). 웹은 화면에 보이는 WebView만 보냄
  // 이전 웹(탭 ID를 보내지 않음)용: 화면에 보이는 WebView가 보낸 값으로 지금 탭 바만 바꿈
  // 탭별로 저장하지 않음(탭 전환과 메시지 순서가 엇갈리면 다른 탭에 저장될 수 있음)
  setNativeTabBarVisible: (visible) => {
    const current = tabsStore.get();
    if (Platform.OS !== 'ios' || !current || typeof visible !== 'boolean')
      return Promise.resolve(false);
    if (current.barHidden === !visible) return Promise.resolve(true);
    tabsStore.set({ ...current, barHidden: !visible });
    return Promise.resolve(true);
  },
  // 탭 WebView가 자기 탭의 값을 알림(#481): 탭마다 저장하고 선택된 탭의 값만 탭 바에 적용(뒤의 탭이 지금 탭 바를 바꾸지 않음)
  setNativeTabBarVisibleFor: (params) => {
    const current = tabsStore.get();
    const parsed = nativeTabBarVisibilitySchema.safeParse(params);
    if (Platform.OS !== 'ios' || !current || !parsed.success || !isTabId(parsed.data.tab))
      return Promise.resolve(false);
    const initial = isTabId(current.selectedId) ? current.selectedId : parsed.data.tab;
    const next = reportTabBar(current, parsed.data.tab, parsed.data.visible, initial);
    if (next !== current) tabsStore.set(next);
    return Promise.resolve(true);
  },
  // 다른 탭으로 전환(웹이 다른 탭 첫 화면으로 가려 할 때, 6.1.2 상세 동작 3). 그 탭 WebView는 보던 화면 그대로
  selectNativeTab: (id) => {
    const current = tabsStore.get();
    if (
      Platform.OS !== 'ios' ||
      !current ||
      typeof id !== 'string' ||
      !isTabId(id) ||
      !current.items.some((item) => item.id === id)
    )
      return Promise.resolve(false);
    router.navigate(`/${id}` as Href);
    return Promise.resolve(true);
  },
  // 한 탭의 변화(지금 번치 등)를 모든 탭 WebView에 보냄. 보낸 탭은 웹이 `from`으로 거름
  notifyNativeTabs: (event) => {
    const parsed = nativeTabEventSchema.parse(event);
    if (!tabsStore.get()) return Promise.resolve(false);
    postMessage('nativeTabEvent', parsed, { broadcast: true });
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
  // 네이티브 플로팅 버튼이 떠 있는 탭의 토스트(#503, 결정 기록 030). 탭 화면이 있는 iOS에서만, 그 밖은 false로 웹 토스트
  showNativeToast: (params) => {
    const parsed = showNativeToastParamsSchema.safeParse(params);
    if (Platform.OS !== 'ios' || !tabsStore.get() || !parsed.success || !isTabId(parsed.data.tab))
      return Promise.resolve(false);
    const { tab, ...toast } = parsed.data;
    toastStore.show(tab, toast);
    return Promise.resolve(true);
  },
  hideNativeToast: (params) => {
    const parsed = hideNativeToastParamsSchema.safeParse(params);
    if (!parsed.success || !isTabId(parsed.data.tab)) return Promise.resolve(false);
    toastStore.hide(parsed.data.tab);
    return Promise.resolve(true);
  },
  // 안드로이드 시스템 햅틱(기기 햅틱 설정을 따름). iOS는 시스템 탭 바가 아니면 쓰이지 않아 선택 햅틱으로 대체
  // 웹이 도착 화면을 그리면 스플래시 마무리(여러 WebView가 보내도 한 번만)
  appReady: async () => markWebReady(),
  tabSelectionHaptic: () =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync(),
  // 사진을 길게 눌러 집어 올린 순간(끌기 시작): 안드로이드는 모든 버전에서 지원하는 길게 누르기 시스템 햅틱(기기의 터치 피드백 설정을 따름), 쓸 수 없으면 진동 모터 충격
  // iOS는 중간 세기 충격. 끌기 시작 전용 햅틱(`Drag_Start`)은 안드로이드 14 이상만 지원하고 기기에 따라 아주 약해서 쓰지 않음
  dragStartHaptic: async () => {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press).catch(() =>
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        );
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      // 햅틱은 보조 효과라 웹에 오류를 올리지 않고 개발 중에만 알림
      if (__DEV__) console.warn('[haptic] 끌기 시작 햅틱을 울리지 못했어요', error);
    }
  },
  // 화면 사건의 햅틱: 완료 축하는 성공 알림, 그 밖은 가벼운 충격. 웹 입력은 스키마로 다시 확인
  feedbackHaptic: async (kind) => {
    try {
      if (hapticKindSchema.parse(kind) === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      if (__DEV__) console.warn('[haptic] 햅틱을 울리지 못했어요', error);
    }
  },
  // 로그인 배경 영상은 iOS 첫 화면에서만 네이티브로(탭 화면 WebView·안드로이드는 false로 웹 영상 사용). 걷기는 항상 받음
  setNativeLoginBackground: (visible) => {
    if (typeof visible !== 'boolean') return Promise.resolve(false);
    if (!visible) {
      loginBackgroundStore.set(false);
      return Promise.resolve(true);
    }
    if (Platform.OS !== 'ios' || tabsStore.get()) return Promise.resolve(false);
    loginBackgroundStore.set(true);
    return Promise.resolve(true);
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
  /** 뒤에 깐 네이티브 화면(로그인 배경 영상)이 비치도록 WebView 바탕을 투명하게 */
  transparent?: boolean;
};

export function AppWebView({ uri, tabId, onLoadStart, transparent = false }: AppWebViewProps) {
  // 탭 화면에서는 가장 가까운 SafeAreaProvider의 값(탭 바 높이 포함) 사용
  const insets = useSafeAreaInsets();
  const safeAreaScript = buildSafeAreaScript(insets);
  const webViewRef = useRef<ComponentRef<typeof WebView>>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  // Android에서 새로 만들 때 다시 열 주소(마지막으로 보던 앱 주소, 처음에는 시작 주소)
  const [restoreUri, setRestoreUri] = useState<string | null>(null);
  const currentUrl = useRef(uri);
  const canGoBack = useRef(false);
  // 로그인·인트로에서는 뒤로 가기를 막음(로그아웃 뒤 앞 기록으로 갔다가 다시 로그인으로 오는 반복 방지)
  const [backAllowed, setBackAllowed] = useState(() => !blocksBackNavigation(uri, WEB_URL));

  // Android 뒤로가기 시 보이는 WebView의 웹 history 우선 처리(막은 화면에서는 시스템 기본 동작)
  // 숨은 탭 WebView도 구독하므로 보이는 것만 처리(아니면 보이는 화면이 넘긴 뒤 숨은 탭의 기록이 되돌아감)
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isVisibleWebView(tabId) || !canGoBack.current) return false;
      if (blocksBackNavigation(currentUrl.current, WEB_URL)) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [tabId]);

  // 값 변경 시(예: 기기 회전) 재주입 — 첫 로드는 injectedJavaScriptBeforeContentLoaded 담당
  useEffect(() => {
    webViewRef.current?.injectJavaScript(safeAreaScript);
  }, [safeAreaScript]);

  // 실행 중에 초대 링크로 앱이 열리면 보이는 WebView가 그 경로로 이동(지금 보던 화면은 뒤로 가기로 돌아갈 수 있게 history에 남김)
  // 처음 실행의 링크는 첫 화면이 시작 주소로 열므로 여기서는 구독 뒤 들어온 링크만 처리
  // 주입만으로는 링크를 지우지 않고, 그 주소로 이동을 시작했을 때(onShouldStartLoadWithRequest) 지움
  // 다시 불러오는 중이라 주입이 무시됐으면 로드가 끝날 때 다시 넘김(받은 지 10초가 지나면 store가 버림)
  const deliverIncomingLink = useCallback(() => {
    const path = incomingLinkStore.get();
    if (!path || !isVisibleWebView(tabId) || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.location.assign(${JSON.stringify(toAppWebUrl(path))});true;`,
    );
  }, [tabId]);
  useEffect(() => incomingLinkStore.subscribe(deliverIncomingLink), [deliverIncomingLink]);

  return (
    <WebView
      key={webViewKey}
      ref={webViewRef}
      source={{ uri: restoreUri ?? uri }}
      style={transparent ? [styles.webview, styles.transparent] : styles.webview}
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
      allowsBackForwardNavigationGestures={backAllowed}
      // 로그인 배경 영상(muted·playsInline·autoPlay)이 자동으로 화면 안에서 재생되게. 기본값이면 멈춘 첫 프레임과 재생 버튼만 보임
      // iOS 기본값(false)에서는 <video playsInline>이 무시되고, 두 설정 모두 이 WebView가 여는 모든 앱 출처 페이지에 적용됨(전역). 소리 있는 영상을 넣을 때 자동 재생 여부를 함께 고려
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      // 웹이 코드로 입력란에 초점을 줄 때도 키보드를 띄움(댓글 말풍선·답글 남기기). iOS 기본값(true)이면 커서만 들어가고 키보드가 올라오지 않음
      // 이 WebView가 여는 모든 앱 출처 페이지에 적용됨(전역). 화면 진입 때 입력란에 초점을 주면 키보드가 바로 뜸(입력이 목적인 번들 상세 말풍선 진입 `?focus=comments`만 의도한 예외)
      keyboardDisplayRequiresUserAction={false}
      // iOS 키보드 위 입력 보조 막대(이전·다음·완료) 숨김(기획 결정, 앱처럼 보이게). 키보드는 입력란 밖을 눌러 닫음. 모든 입력란에 적용(전역)
      hideKeyboardAccessoryView
      // 스플래시는 웹의 appReady(도착 화면이 내용을 그림)로 닫음. 페이지를 못 불러오면 오류 화면이 보이게 바로 닫음
      // 새 문서를 열면 이전 문서가 남긴 네이티브 UI(플로팅 버튼) 정리
      onLoadStart={() => {
        // 선택된 탭의 WebView만(뒤에서 미리 그려지는 다른 탭이 대기를 풀지 않게)
        if (tabId && tabsStore.get()?.selectedId === tabId) markTabWebViewLoading();
        onLoadStart?.();
      }}
      onLoadEnd={deliverIncomingLink}
      onError={forceWebReady}
      onHttpError={forceWebReady}
      // 오래 백그라운드에 있으면 OS가 웹 프로세스를 끝내 화면이 하얗게 남으므로 다시 불러옴
      // iOS는 같은 WebView를 다시 불러오고, Android는 끝난 WebView를 쓸 수 없어 새로 만듦
      onContentProcessDidTerminate={() => webViewRef.current?.reload()}
      onRenderProcessGone={() => {
        // 보던 화면으로 다시 엶(앱 출처일 때만, 저장하지 않은 입력은 복구하지 않음)
        setRestoreUri(isAppWebUrl(currentUrl.current, WEB_URL) ? currentUrl.current : null);
        // 새 WebView에는 기록이 없어 첫 이동 전까지 뒤로 가기를 앱에 넘김
        canGoBack.current = false;
        setWebViewKey((key) => key + 1);
      }}
      onNavigationStateChange={(navState) => {
        canGoBack.current = navState.canGoBack;
        currentUrl.current = navState.url;
        setBackAllowed(!blocksBackNavigation(navState.url, WEB_URL));
      }}
      onShouldStartLoadWithRequest={(request) => {
        // 받은 초대 링크로 이동을 시작했으면 그때 비움(다시 넘기지 않게)
        const linkPath = incomingLinkStore.get();
        if (linkPath && request.url === toAppWebUrl(linkPath)) incomingLinkStore.clear(linkPath);
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
  // iOS WebView는 바탕색이 투명이면 불투명 처리(opaque)를 꺼서 웹의 투명한 배경 뒤가 보임
  transparent: {
    backgroundColor: 'transparent',
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
