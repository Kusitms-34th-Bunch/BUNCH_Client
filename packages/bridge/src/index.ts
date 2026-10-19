import type { BridgeStore } from '@webview-bridge/types';
import type { GalleryImage, SetNativeTabBarParams, ShareParams } from './schema';

export {
  appPostMessageSchema,
  galleryImageSchema,
  nativeTabBarItemSchema,
  nativeTabPressSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
} from './schema';
export type {
  AppPostMessageSchema,
  GalleryImage,
  NativeTabBarItem,
  NativeTabPress,
  SetNativeTabBarParams,
  ShareParams,
} from './schema';

/** 네이티브 구현과 웹 호출부가 공유하는 bridge 메서드 계약 */
export type AppBridgeMethods = {
  /** 갤러리 사진의 임시 미리보기. 취소 시 null */
  pickGalleryImage: () => Promise<GalleryImage | null>;
  /** 네이티브 공유 시트 호출, 일반 브라우저에서는 Web Share API로 대체 */
  share: (_params: ShareParams) => Promise<void>;
  /** 네이티브 탭 막대 표시·갱신. 미지원 환경에서는 false 반환, 탭 선택은 nativeTabPress로 전달 */
  setNativeTabBar: (_params: SetNativeTabBarParams) => Promise<boolean>;
};

/** bridge/linkBridge가 요구하는 store 계약 적용, 메서드 객체 직접 전달 시 index signature 불일치 */
export type AppBridge = BridgeStore<AppBridgeMethods>;
