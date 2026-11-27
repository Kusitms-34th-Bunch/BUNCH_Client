import { bridge, createWebView } from '@webview-bridge/react-native';
import { Platform, Share } from 'react-native';
import {
  appPostMessageSchema,
  nativeTabEventSchema,
  pushOpenSchema,
  shareParamsSchema,
  type AppBridgeMethods,
} from '@app/bridge';
import { saveImagesToAlbum } from '../album-save';
import { getAppVersion } from '../app-version';
import { copyToClipboard, readClipboard } from '../clipboard';
import { pickGalleryImage } from '../gallery-image';
import {
  capturePhoto,
  pickGalleryImages,
  readPickedPhoto,
  releasePickedPhotos,
} from '../gallery-upload';
import { loginBackgroundStore } from '../login-background/login-background-store';
import { getPermissionStatus, openAppSettings, requestPermission } from '../permissions';
import { getPushDeviceRegistration, getPushInstallationId } from '../push-device';
import { pushOpenStore } from '../push-open-store';
import { beginScreenSwitch, cancelScreenSwitch, finishScreenSwitch } from '../screen-switch';
import { authorizeApple, socialLogin } from '../social-login';
import { markWebReady } from '../splash/state';
import { isTabId } from '../tabs/tabs';
import { tabsStore } from '../tabs/tabs-store';
import { hapticBridge } from './bridge-haptics';
import { tabBridge } from './bridge-tabs';
import { settleSwipeBack } from './swipe-back';
import { isVisibleWebView } from './visible-web-view';

// 기능별 처리 표끼리 메서드 이름이 겹치면 펼칠 때 뒤 값이 조용히 덮어써서 컴파일 오류로 막음
// 아래에 직접 쓴 메서드와 겹치는 것은 TypeScript가 TS2783으로 잡음
type SharedBridgeKeys = keyof typeof tabBridge & keyof typeof hapticBridge;
export const bridgeGroupsDisjoint: [SharedBridgeKeys] extends [never] ? true : never = true;

// bridge의 index signature 충족을 위해 인라인 객체 리터럴 사용(기능별 처리 표는 펼쳐 넣음)
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
  getAppVersion,
  // 푸시로 연 알림은 화면에 보이는 WebView(웹이 보낸 자기 탭 ID, 첫 화면은 null)만 가져감
  takeOpenedPush: (tab) => {
    const tabId = typeof tab === 'string' && isTabId(tab) ? tab : undefined;
    if (tab !== null && !tabId) return Promise.resolve(null);
    if (!isVisibleWebView(tabId)) return Promise.resolve(null);
    const open = pushOpenStore.take();
    return Promise.resolve(open && pushOpenSchema.safeParse(open).success ? open : null);
  },
  // 번치 전환: 화면에 보이는 WebView(자기 탭 ID)만 화면을 덮을 수 있음(뒤 탭이 화면을 가려 입력을 막지 않게)
  beginScreenSwitch: (tab) => {
    const tabId = typeof tab === 'string' && isTabId(tab) ? tab : undefined;
    if (!tabId || !isVisibleWebView(tabId)) return Promise.resolve(false);
    return beginScreenSwitch();
  },
  finishScreenSwitch,
  cancelScreenSwitch,
  copyToClipboard,
  readClipboard,
  socialLogin,
  authorizeApple,
  share: async (params) => {
    const { url, title } = shareParamsSchema.parse(params);
    await Share.share({ message: title ? `${title}\n${url}` : url, url });
  },
  // 한 탭의 변화(지금 번치 등)를 모든 탭 WebView에 보냄. 보낸 탭은 웹이 `from`으로 거름
  notifyNativeTabs: (event) => {
    const parsed = nativeTabEventSchema.parse(event);
    if (!tabsStore.get()) return Promise.resolve(false);
    postMessage('nativeTabEvent', parsed, { broadcast: true });
    return Promise.resolve(true);
  },
  // 스와이프로 돌아간 화면을 웹이 그림: 이동 순간 덮은 화면을 걷음(덮은 게 없으면 아무것도 안 함)
  swipeBackSettled: async () => settleSwipeBack(),
  // 웹이 도착 화면을 그리면 스플래시 마무리(여러 WebView가 보내도 한 번만)
  appReady: async () => markWebReady(),
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
  ...tabBridge,
  ...hapticBridge,
} satisfies AppBridgeMethods);

// postMessage: 네이티브 → 웹 이벤트(탭 WebView 여러 개라 broadcast로 보내고 웹이 대상 확인)
export const { WebView, postMessage } = createWebView({
  bridge: appBridge,
  postMessageSchema: appPostMessageSchema,
});
