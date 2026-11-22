import type { AppBridge, AppBridgeMethods, AppPostMessageSchema, ShareParams } from '@app/bridge';
import { linkBridge } from '@webview-bridge/web';

/** 일반 브라우저용 폴백 제공, 메서드 추가 시 packages/bridge 계약과 함께 갱신 필요 */
export const appBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  initialBridge: {
    share: async ({ url, title }: ShareParams) => {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(title ? { url, title } : { url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    },
    // 브라우저는 `navigator.clipboard`(보안 컨텍스트 필요)로 대체. 쉘에서는 쉘이 이 메서드를 구현
    copyToClipboard: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    },
    readClipboard: async () => {
      try {
        return (await navigator.clipboard.readText()).trim() || null;
      } catch {
        return null;
      }
    },
    // 브라우저에는 시스템 권한 팝업 없음. 호출부에서 먼저 isNativeShell()로 확인 필요
    requestPermission: () => Promise.resolve('undetermined'),
    // 브라우저에는 시스템 권한이 없어 읽을 상태도 없음. 호출부에서 먼저 isNativeShell()로 확인 필요
    getPermissionStatus: () => Promise.resolve('undetermined'),
    // 브라우저에는 푸시 토큰이 없음(서버 푸시 기기 등록은 iOS 쉘만). 호출부에서 먼저 isNativeShell()로 확인 필요
    getPushDeviceRegistration: () => Promise.resolve(null),
    getPushInstallationId: () => Promise.resolve(null),
    // 브라우저에는 소셜 로그인 SDK 없음. 쉘에서만 로그인할 수 있어 호출부가 실패로 처리
    socialLogin: () => Promise.reject(new Error('네이티브 쉘에서만 소셜 로그인을 할 수 있어요.')),
    // 브라우저에는 Apple 로그인 창 없음. 탈퇴 전 재인증은 쉘에서만 가능해 호출부가 실패로 처리
    authorizeApple: () => Promise.reject(new Error('네이티브 쉘에서만 Apple 인증을 할 수 있어요.')),
    // 브라우저에서는 웹 탭 막대 사용
    setNativeTabBar: () => Promise.resolve(false),
    // 브라우저·이전 쉘은 탭별 표시를 모름(부르는 쪽이 hasNativeMethod로 확인)
    setNativeTabBarVisibleFor: () => Promise.resolve(false),
    // 브라우저에는 햅틱 없음
    tabSelectionHaptic: () => Promise.resolve(),
    // 브라우저·이전 쉘에는 끌기 햅틱 없음
    dragStartHaptic: () => Promise.resolve(),
    // 브라우저에는 시스템 탭 바 없음
    setNativeTabBarVisible: () => Promise.resolve(false),
    // 브라우저·이 메서드가 없는 이전 쉘은 웹 플로팅 버튼 사용
    setNativeFloatingButton: () => Promise.resolve(false),
    // 브라우저·이전 쉘은 웹 토스트(부르는 쪽이 hasNativeMethod로 확인)
    showNativeToast: () => Promise.resolve(false),
    hideNativeToast: () => Promise.resolve(false),
    // 브라우저·이전 쉘은 탭 전환이 없어 부르는 쪽이 주소 이동
    selectNativeTab: () => Promise.resolve(false),
    // 브라우저는 탭 WebView가 하나라 알릴 다른 탭 없음
    notifyNativeTabs: () => Promise.resolve(false),
    // 브라우저에는 앱 스플래시 없음
    appReady: () => Promise.resolve(),
    // 브라우저·이전 쉘에는 햅틱 없음
    feedbackHaptic: () => Promise.resolve(),
    // 브라우저는 웹 영상으로 로그인 배경을 그림
    setNativeLoginBackground: () => Promise.resolve(false),
    // 브라우저에는 푸시로 여는 일이 없음
    takeOpenedPush: () => Promise.resolve(null),
    // 브라우저·이전 쉘은 웹 안에서 전환 모션(부르는 쪽이 hasNativeMethod로 확인)
    beginScreenSwitch: () => Promise.resolve(false),
    finishScreenSwitch: () => Promise.resolve(),
    cancelScreenSwitch: () => Promise.resolve(),
  },
});

/** iOS 쉘 탭 화면의 WebView면 쉘이 sessionStorage에 넣어 준 그 탭 ID, 아니면 null */
export const nativeShellTab = (): string | null => {
  try {
    return sessionStorage.getItem('bunch-shell-tab');
  } catch {
    return null;
  }
};

let handedOffToNativeTabs = false;

/**
 * 첫 화면 WebView가 iOS 탭 화면을 시작함(곧 버려지는 WebView라 앱 스플래시는 탭 WebView가 닫음)
 * 탭 WebView가 자기 탭 ID(sessionStorage)를 못 읽으면 첫 화면으로 잘못 보고 쉘의 10초 안전장치까지 스플래시가 남음
 */
export const markHandedOffToNativeTabs = () => {
  if (nativeShellTab() === null) handedOffToNativeTabs = true;
};

/** 이 문서가 탭 화면을 시작하고 버려질 첫 화면 WebView인지 */
export const isHandedOffToNativeTabs = () => handedOffToNativeTabs;

/** initialBridge 지원 여부와 별개로 실제 네이티브 호스트 확인 */
export const isNativeShell = () => typeof window !== 'undefined' && 'ReactNativeWebView' in window;

// 쉘이 실제로 구현한 메서드 확인용. initialBridge가 없어 폴백 이름을 「있음」으로 세지 않음
const nativeMethods = linkBridge<AppBridge, AppPostMessageSchema>({});

/**
 * 앱 쉘이 이 메서드를 실제로 구현했는지(이전 쉘 빌드에는 없을 수 있음)
 * `appBridge.isNativeMethodAvailable`은 initialBridge 폴백 이름까지 있다고 답해 쓰지 않음(@webview-bridge/web 1.8.0)
 */
export const hasNativeMethod = (method: keyof AppBridgeMethods) =>
  isNativeShell() && nativeMethods.isNativeMethodAvailable(method);

// iOS 쉘의 탭 화면 ID(쉘 `src/tabs/tabs.ts`의 TAB_IDS와 같은 값). 탭 첫 화면 경로는 `/${id}`
const SHELL_TAB_IDS = ['feed', 'photos', 'bunch', 'my'] as const;

/**
 * 다른 탭의 첫 화면(`/bunch` 등)으로 갈 때 iOS 쉘이면 그 탭으로 전환(탭마다 WebView라 주소 이동은 지금 탭 화면을 바꿈)
 * 전환했으면 true. 쉘이 아니거나 지금 탭이거나 전환하지 못하면 false라 부르는 쪽이 주소 이동
 */
export const selectShellTabFor = async (href: string): Promise<boolean> => {
  const id = SHELL_TAB_IDS.find((tab) => href === `/${tab}`);
  // 보이지 않는 탭의 요청은 보내지 않음(사용자가 보던 탭이 바뀌지 않게)
  if (!id || !isNativeShell() || nativeShellTab() === id) return false;
  if (document.visibilityState !== 'visible') return false;
  return appBridge.selectNativeTab(id).catch(() => false);
};

/** 탭 첫 화면으로 가는 이동: iOS 쉘에서 다른 탭이면 그 탭으로 전환, 아니면 `push`로 주소 이동 */
export const openTabPath = (href: string, push: (_href: string) => void) =>
  void selectShellTabFor(href).then((selected) => {
    if (!selected) push(href);
  });

/** 사용자 선택 대기 중에는 타임아웃 없이 갤러리 응답 대기, 기존 브리지의 대기 정책 유지 */
export const galleryBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['pickGalleryImage'],
});

/** 소셜 로그인·Apple 재인증 창은 사용자가 끝낼 때까지 기다려야 하므로 타임아웃 없음, SDK 오류는 reject로 전달 */
export const loginBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['socialLogin', 'authorizeApple'],
});

/** 사진함 업로드용 선택·촬영·읽기, 앨범 저장, 설정 열기. 사용자 선택과 쉘의 사진 가공·내려받기를 기다려야 하므로 타임아웃 없음, 오류는 reject */
export const photoUploadBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: [
    'pickGalleryImages',
    'capturePhoto',
    'readPickedPhoto',
    'releasePickedPhotos',
    'saveImagesToAlbum',
    'openAppSettings',
  ],
});

/** 시스템 권한 팝업은 사용자가 응답할 때까지 기다려야 하므로 타임아웃 없음 */
export const permissionBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['requestPermission', 'getPermissionStatus'],
});

/**
 * 푸시 기기 정보 읽기: 토큰은 APNs 등록을 기다릴 수 있어 기본보다 넉넉한 제한 시간(10초)을 두고, 시간 초과·오류는 reject로 받아 호출부가 건너뜀
 * 푸시 등록은 앱 사용을 막으면 안 되므로 호출부가 오류를 삼키고 다음 기회에 다시 시도함
 */
export const pushDeviceBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 10_000,
  throwOnError: ['getPushDeviceRegistration', 'getPushInstallationId'],
});

/** 클립보드 읽기 전용: iOS는 사용자가 붙여넣기를 허용할 때까지 기다리므로 타임아웃 없음(복사는 기본 `appBridge`의 타임아웃을 씀) */
export const clipboardBridge = linkBridge<AppBridge, AppPostMessageSchema>({ timeout: 0 });
