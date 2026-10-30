import type { BridgeStore } from '@webview-bridge/types';
import type {
  GalleryImage,
  PermissionKind,
  PermissionStatus,
  SetNativeTabBarParams,
  ShareParams,
} from './schema';

export {
  appPostMessageSchema,
  galleryImageSchema,
  nativeTabBarItemSchema,
  permissionKindSchema,
  permissionStatusSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
} from './schema';
export type {
  AppPostMessageSchema,
  GalleryImage,
  NativeTabBarItem,
  PermissionKind,
  PermissionStatus,
  SetNativeTabBarParams,
  ShareParams,
} from './schema';

/** 네이티브 구현과 웹 호출부가 공유하는 bridge 메서드 계약 */
export type AppBridgeMethods = {
  /** 갤러리 사진의 임시 미리보기. 취소 시 null */
  pickGalleryImage: () => Promise<GalleryImage | null>;
  /** 시스템 권한 팝업 요청. 이미 정해진 권한은 팝업 없이 현재 상태 반환 */
  requestPermission: (_kind: PermissionKind) => Promise<PermissionStatus>;
  /** 네이티브 공유 시트 호출, 일반 브라우저에서는 Web Share API로 대체 */
  share: (_params: ShareParams) => Promise<void>;
  /** iOS 쉘의 시스템 탭 화면 시작·종료. 미지원 환경(브라우저·안드로이드)에서는 false 반환 */
  setNativeTabBar: (_params: SetNativeTabBarParams) => Promise<boolean>;
};

/** bridge/linkBridge가 요구하는 store 계약 적용, 메서드 객체 직접 전달 시 index signature 불일치 */
export type AppBridge = BridgeStore<AppBridgeMethods>;
