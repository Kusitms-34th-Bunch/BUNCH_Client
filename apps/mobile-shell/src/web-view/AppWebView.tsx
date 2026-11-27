import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentRef,
} from 'react';
import { BackHandler, Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { incomingLinkStore } from '../incoming-link-store';
import { insetsHold } from '../screen-switch';
import { buildSafeAreaScript } from '../safe-area-script';
import { forceWebReady, markTabWebViewLoading } from '../splash/state';
import { WebLoadError } from './WebLoadError';
import { type TabId } from '../tabs/tabs';
import { tabsStore } from '../tabs/tabs-store';
import { blocksBackNavigation, isAppWebUrl } from '../web-url';
import { WEB_URL, toAppWebUrl } from './app-web-url';
import { WebView } from './app-bridge';
import { attachSwipeBack } from './swipe-back';
import { shellUserAgentName } from './user-agent';
import { floatingButtons, isVisibleWebView } from './visible-web-view';

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
  const liveInsets = useSafeAreaInsets();
  // 번치 전환 동안은 상태 바를 숨겨 바뀐 값 대신 전환 전 값을 유지(화면이 위아래로 밀리지 않게)
  const insetsHeld = useSyncExternalStore(insetsHold.subscribe, insetsHold.get);
  const [insets, setInsets] = useState(liveInsets);
  useEffect(() => {
    if (!insetsHeld) setInsets(liveInsets);
  }, [insetsHeld, liveInsets]);
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

  // 처음 불러올 때 화면 밖이던 탭 WebView는 그때 찾지 못하므로 탭이 바뀔 때도 붙임(이미 붙은 것은 건너뜀)
  useEffect(() => {
    // 인스턴스마다 새 함수로 구독(같은 함수면 store Set에 하나만 남아 한 화면의 정리가 다른 화면 구독까지 지움)
    const unsubscribe = tabsStore.subscribe(() => attachSwipeBack());
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <WebView
      key={webViewKey}
      ref={webViewRef}
      source={{ uri: restoreUri ?? uri }}
      // TestFlight 테스터용 빌드만 개발 서버 표시(웹이 개발 백엔드로 보냄, #581). Metro가 넣도록 직접 접근
      applicationNameForUserAgent={shellUserAgentName(process.env.EXPO_PUBLIC_API_ENV)}
      style={transparent ? [styles.webview, styles.transparent] : styles.webview}
      injectedJavaScriptBeforeContentLoaded={
        tabId ? `${buildShellTabScript(tabId)}${safeAreaScript}` : safeAreaScript
      }
      // WebView 자체 inset 보정 해제(웹이 여백을 적용하므로 이중 적용 방지)
      contentInsetAdjustmentBehavior="never"
      // 스크롤은 웹 화면 안쪽 영역(PageShell main)이 맡으므로 문서 전체가 당겨지며 바깥 흰 배경이 드러나지 않게
      bounces={false}
      // 키보드가 뜰 때 iOS가 문서 전체를 끌어올리지 않게(앱 틀 높이는 웹 KeyboardViewport가 맞춤, 올린 채 남아 헤더까지 못 내려가던 문제 #568)
      scrollEnabled={false}
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
      // Android 시스템 글자 크기로 웹 화면 전체가 커지지 않게(웹 글자 크기는 디자인 토큰 기준)
      textZoom={100}
      // 스플래시는 웹의 appReady(도착 화면이 내용을 그림)로 닫음. 페이지를 못 불러오면 오류 화면이 보이게 바로 닫음
      // 새 문서를 열면 이전 문서가 남긴 네이티브 UI(플로팅 버튼) 정리
      onLoadStart={() => {
        // 선택된 탭의 WebView만(뒤에서 미리 그려지는 다른 탭이 대기를 풀지 않게)
        if (tabId && tabsStore.get()?.selectedId === tabId) markTabWebViewLoading();
        onLoadStart?.();
      }}
      // 스와이프 뒤로 가기를 웹 전환과 맞추는 네이티브 제스처를 붙임(iOS, 이미 붙은 WebView는 건너뜀)
      onLoadEnd={() => {
        attachSwipeBack();
        deliverIncomingLink();
      }}
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
        if (tabId) floatingButtons.reportUrl(tabId, navState.url);
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
      renderError={() => <WebLoadError onRetry={() => webViewRef.current?.reload()} />}
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
});
