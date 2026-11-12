import type { AppBridge, AppPostMessageSchema, ShareParams } from '@app/bridge';
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
    // 브라우저에서는 웹 탭 막대 사용
    setNativeTabBar: () => Promise.resolve(false),
    // 브라우저에는 햅틱 없음
    tabSelectionHaptic: () => Promise.resolve(),
    // 브라우저에는 시스템 탭 바 없음
    setNativeTabBarVisible: () => Promise.resolve(false),
    // 브라우저에는 앱 스플래시 없음
    appReady: () => Promise.resolve(),
  },
});

/** initialBridge 지원 여부와 별개로 실제 네이티브 호스트 확인 */
export const isNativeShell = () => typeof window !== 'undefined' && 'ReactNativeWebView' in window;

/** 사용자 선택 대기 중에는 타임아웃 없이 갤러리 응답 대기, 기존 브리지의 대기 정책 유지 */
export const galleryBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['pickGalleryImage'],
});

/** 소셜 로그인 창은 사용자가 끝낼 때까지 기다려야 하므로 타임아웃 없음, SDK 오류는 reject로 전달 */
export const loginBridge = linkBridge<AppBridge, AppPostMessageSchema>({
  timeout: 0,
  throwOnError: ['socialLogin'],
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
