import type { BridgeStore } from '@webview-bridge/types';
import type {
  GalleryImage,
  HapticKind,
  NativeTabEvent,
  PermissionKind,
  PermissionStatus,
  PickGalleryImageOptions,
  PickGalleryImagesOptions,
  PickPhotosResult,
  PushDeviceRegistration,
  SaveImagesToAlbumResult,
  SetNativeFloatingButtonParams,
  SetNativeTabBarParams,
  ShareParams,
  SocialLoginResult,
  SocialProvider,
  UploadImage,
} from './schema';

export {
  appPostMessageSchema,
  clipboardTextSchema,
  galleryImageSchema,
  hapticKindSchema,
  isSavableImageUrl,
  MAX_PICKED_PHOTOS,
  MAX_SAVE_IMAGES,
  MAX_UPLOAD_IMAGE_DATA_URL,
  nativeFloatingButtonPressSchema,
  nativeTabBarItemSchema,
  nativeTabEventSchema,
  nativeTabReselectSchema,
  permissionKindSchema,
  permissionStatusSchema,
  PHOTO_SOURCE_TYPES,
  pickedPhotoIdSchema,
  pickedPhotoIdsSchema,
  pickedPhotoSchema,
  pickGalleryImageOptionsSchema,
  pickGalleryImagesOptionsSchema,
  pickPhotosResultSchema,
  pushAuthorizationStatusSchema,
  pushDeviceRegistrationSchema,
  pushDeviceTokenSchema,
  pushEnvironmentSchema,
  saveImagesToAlbumResultSchema,
  saveImageUrlSchema,
  saveImageUrlsSchema,
  setNativeFloatingButtonParamsSchema,
  setNativeTabBarParamsSchema,
  shareParamsSchema,
  socialLoginResultSchema,
  socialProviderSchema,
  uploadImageSchema,
} from './schema';
export type {
  AppPostMessageSchema,
  GalleryImage,
  HapticKind,
  NativeFloatingButtonPress,
  NativeTabBarItem,
  NativeTabEvent,
  PermissionKind,
  PermissionStatus,
  PhotoSourceType,
  PickedPhoto,
  PickGalleryImageOptions,
  PickGalleryImagesOptions,
  PickPhotosResult,
  PushDeviceRegistration,
  SaveImagesToAlbumResult,
  SetNativeFloatingButtonParams,
  SetNativeTabBarParams,
  ShareParams,
  SocialLoginResult,
  SocialProvider,
  UploadImage,
} from './schema';

/** 네이티브 구현과 웹 호출부가 공유하는 bridge 메서드 계약 */
export type AppBridgeMethods = {
  /** 갤러리 사진의 임시 미리보기. 취소 시 null. 옵션을 모르는 이전 앱은 무시하고 정사각형 편집 결과를 돌려줌 */
  pickGalleryImage: (_options?: PickGalleryImageOptions) => Promise<GalleryImage | null>;
  /** 갤러리에서 여러 장 선택(최대 50장). 사진 데이터는 담지 않고 `readPickedPhoto`로 하나씩 읽음. 취소는 `canceled` */
  pickGalleryImages: (_options?: PickGalleryImagesOptions) => Promise<PickPhotosResult>;
  /** 카메라로 한 장 촬영. 카메라 권한이 거부되어 있으면 `denied`, 닫으면 `canceled` */
  capturePhoto: () => Promise<PickPhotosResult>;
  /** 고른 사진 한 장을 업로드용으로 가공해 돌려줌(긴 변 2560px 이하 JPEG, 위치를 포함한 모든 메타데이터 제거). 모르는 id는 reject */
  readPickedPhoto: (_id: string) => Promise<UploadImage>;
  /** 업로드가 끝난 사진 정보를 쉘이 놓아 줌(ids를 생략하면 모두). 모르는 id는 무시 */
  releasePickedPhotos: (_ids?: string[]) => Promise<void>;
  /** 이미지 주소들(https, 최대 50개)을 쉘이 내려받아 휴대폰 앨범에 저장. 사진별 성공 여부를 주소 순서대로 돌려주고, 저장 권한이 거부되어 있으면 `denied`. 사진 데이터는 웹으로 넘기지 않음 */
  saveImagesToAlbum: (_urls: string[]) => Promise<SaveImagesToAlbumResult>;
  /** 앱의 시스템 설정 화면 열기(사진·카메라 권한 거부 안내의 「설정으로 이동」) */
  openAppSettings: () => Promise<void>;
  /** 시스템 권한 팝업 요청. 이미 정해진 권한은 팝업 없이 현재 상태 반환 */
  requestPermission: (_kind: PermissionKind) => Promise<PermissionStatus>;
  /** 시스템 권한의 현재 상태만 읽음(팝업을 띄우지 않음). 설정에서 권한을 바꾸고 돌아온 화면이 다시 확인할 때 사용. 미지원 환경(브라우저)에서는 `undetermined` */
  getPermissionStatus: (_kind: PermissionKind) => Promise<PermissionStatus>;
  /** 이 기기의 푸시 등록 정보(설치 ID·APNs 토큰·환경·알림 권한 상태). 서버 푸시 기기 등록에 씀. iOS 쉘에서만 값이 있고, 그 밖(안드로이드·브라우저·토큰을 받지 못한 기기)은 null. 토큰은 로그·오류에 남기지 않음 */
  getPushDeviceRegistration: () => Promise<PushDeviceRegistration | null>;
  /** 이 설치의 푸시 기기 ID만 읽음(토큰을 얻지 않아 빠르고 권한 창도 없음). 로그아웃 때 서버에서 이 기기를 해제하는 데 씀. 아직 등록한 적이 없으면 null */
  getPushInstallationId: () => Promise<string | null>;
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
  /** 탭 화면의 플로팅 버튼을 네이티브 Liquid Glass로 표시·제거. 그렸으면 true(웹 버튼을 숨김), iOS 26 미만·탭 화면 밖·미지원 환경이면 false. 눌림은 `nativeFloatingButtonPress` */
  setNativeFloatingButton: (_params: SetNativeFloatingButtonParams) => Promise<boolean>;
  /** iOS 쉘 탭 화면에서 그 탭으로 전환(탭마다 WebView라 다른 탭 경로로 주소 이동하면 지금 탭 화면이 바뀜). 전환했으면 true, 탭 화면이 아니거나 없는 탭·미지원 환경이면 false */
  selectNativeTab: (_id: string) => Promise<boolean>;
  /** 다른 탭 WebView에 변화를 알림(쉘이 모든 탭에 `nativeTabEvent`로 보냄). 탭 화면이 아니거나 미지원 환경이면 false */
  notifyNativeTabs: (_event: NativeTabEvent) => Promise<boolean>;
  /** 웹 탭 막대를 누를 때의 선택 햅틱(안드로이드 쉘). iOS 시스템 탭 바는 쉘이 직접 처리 */
  tabSelectionHaptic: () => Promise<void>;
  /** 끌어서 순서를 바꾸려고 사진을 집어 올린 순간의 햅틱(번들 사진 썸네일 길게 눌러 끌기). 안드로이드는 길게 누르기 시스템 햅틱(기기의 터치 피드백 설정을 따름), iOS는 중간 세기 충격 햅틱. 브라우저·이 메서드가 없는 이전 쉘에서는 동작 없음 */
  dragStartHaptic: () => Promise<void>;
  /** 웹이 로그인 상태를 확인해 도착 화면(또는 오류 안내)의 내용까지 그림(화면 전체 로딩이 없음). 쉘은 이때 스플래시를 닫음. 여러 번 불러도 한 번만 처리하고, 첫 화면 → 탭 화면으로 넘어가는 중에는 탭 WebView의 신호만 받음. 브라우저에서는 아무것도 하지 않음 */
  appReady: () => Promise<void>;
  /** 화면 사건의 햅틱(완료 축하는 성공 알림, 좋아요·콕하기·피드 끝은 가벼운 충격). 브라우저·이 메서드가 없는 이전 쉘에서는 동작 없음 */
  feedbackHaptic: (_kind: HapticKind) => Promise<void>;
  /** iOS 쉘 첫 화면 WebView 뒤에 로그인 배경 영상(앱에 든 영상)을 깔거나 걷음. 깔았으면 true(웹은 자기 영상·첫 프레임을 빼고 배경을 투명하게), 탭 화면·안드로이드·브라우저·이 메서드가 없는 이전 쉘이면 false(웹 영상 사용) */
  setNativeLoginBackground: (_visible: boolean) => Promise<boolean>;
};

/** bridge/linkBridge가 요구하는 store 계약 적용, 메서드 객체 직접 전달 시 index signature 불일치 */
export type AppBridge = BridgeStore<AppBridgeMethods>;
