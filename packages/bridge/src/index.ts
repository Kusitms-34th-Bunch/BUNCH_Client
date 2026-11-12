import type { BridgeStore } from '@webview-bridge/types';
import type {
  GalleryImage,
  PermissionKind,
  PermissionStatus,
  PickGalleryImageOptions,
  SetNativeTabBarParams,
  ShareParams,
  SocialLoginResult,
  SocialProvider,
} from './schema';

export {
  appPostMessageSchema,
  clipboardTextSchema,
  galleryImageSchema,
  nativeTabBarItemSchema,
  permissionKindSchema,
  permissionStatusSchema,
  pickGalleryImageOptionsSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
  socialLoginResultSchema,
  socialProviderSchema,
} from './schema';
export type {
  AppPostMessageSchema,
  GalleryImage,
  NativeTabBarItem,
  PermissionKind,
  PermissionStatus,
  PickGalleryImageOptions,
  SetNativeTabBarParams,
  ShareParams,
  SocialLoginResult,
  SocialProvider,
} from './schema';

/** 네이티브 구현과 웹 호출부가 공유하는 bridge 메서드 계약 */
export type AppBridgeMethods = {
  /** 갤러리 사진의 임시 미리보기. 취소 시 null. 옵션을 모르는 이전 앱은 무시하고 정사각형 편집 결과를 돌려줌 */
  pickGalleryImage: (_options?: PickGalleryImageOptions) => Promise<GalleryImage | null>;
  /** 시스템 권한 팝업 요청. 이미 정해진 권한은 팝업 없이 현재 상태 반환 */
  requestPermission: (_kind: PermissionKind) => Promise<PermissionStatus>;
  /** 네이티브 SDK 소셜 로그인. 성공하면 서버 로그인에 쓸 ID 토큰(·nonce)을 돌려주고, 창을 닫으면 `cancelled`, SDK 오류는 reject. 미지원 환경(브라우저)에서는 reject */
  socialLogin: (_provider: SocialProvider) => Promise<SocialLoginResult>;
  /** 텍스트를 시스템 클립보드에 복사. 성공 여부를 돌려주고(검증 실패·오류는 false) 브라우저에서는 `navigator.clipboard`로 대체. WebView의 http 개발 주소는 보안 컨텍스트가 아니라 `navigator.clipboard`가 없어서 필요 */
  copyToClipboard: (_text: string) => Promise<boolean>;
  /** 시스템 클립보드의 텍스트를 읽음. 비어 있거나 텍스트가 아니거나 상한을 넘으면 null. 사용자가 누른 동작 직후에만 호출(iOS는 붙여넣기 허용 팝업이 뜰 수 있음) */
  readClipboard: () => Promise<string | null>;
  /** 네이티브 공유 시트 호출, 일반 브라우저에서는 Web Share API로 대체 */
  share: (_params: ShareParams) => Promise<void>;
  /** iOS 쉘의 시스템 탭 화면 시작·종료. 미지원 환경(브라우저·안드로이드)에서는 false 반환 */
  setNativeTabBar: (_params: SetNativeTabBarParams) => Promise<boolean>;
  /** iOS 탭 화면의 시스템 탭 바 표시 여부(탭 밖 화면을 여는 동안 숨김). 화면에 보이는 WebView만 호출, 탭 화면이 아니거나 미지원 환경이면 false */
  setNativeTabBarVisible: (_visible: boolean) => Promise<boolean>;
  /** 웹 탭 막대를 누를 때의 선택 햅틱(안드로이드 쉘). iOS 시스템 탭 바는 쉘이 직접 처리 */
  tabSelectionHaptic: () => Promise<void>;
  /** 웹이 로그인 상태를 확인해 도착 화면(또는 오류 안내)을 그림. 쉘은 이때 스플래시를 닫음. 여러 번 불러도 한 번만 처리, 브라우저에서는 아무것도 하지 않음 */
  appReady: () => Promise<void>;
};

/** bridge/linkBridge가 요구하는 store 계약 적용, 메서드 객체 직접 전달 시 index signature 불일치 */
export type AppBridge = BridgeStore<AppBridgeMethods>;
