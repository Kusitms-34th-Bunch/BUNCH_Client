import { z } from 'zod';

// 미리보기용 전송 상한: base64 약 4MiB(원본 약 3MiB)
export const galleryImageSchema = z.object({
  dataUrl: z
    .string()
    .max(4 * 1024 * 1024)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

/** 갤러리 선택 옵션. `edit`가 false면 시스템 정사각형 편집 없이 원본(긴 변을 줄인 JPEG)을 전달, 웹이 직접 자름 */
export const pickGalleryImageOptionsSchema = z
  .object({ edit: z.boolean().optional() })
  .strict()
  .optional();
export type PickGalleryImageOptions = z.infer<typeof pickGalleryImageOptionsSchema>;

/** 사진함에 한 번에 올릴 수 있는 사진 수(기능명세서 3.2.2) */
export const MAX_PICKED_PHOTOS = 50;

// 업로드용 사진 전송 상한: base64 약 14MiB(JPEG 약 10MiB). 긴 변 2560px JPEG는 보통 수 MB이고 쉘이 목표 크기(4MiB) 아래로 맞추고 웹이 4.4MB 이하를 한 번 더 확인하므로 이 값은 출력 검증용 최대치
export const MAX_UPLOAD_IMAGE_DATA_URL = 14 * 1024 * 1024;

// 2026-02-31 같은 존재하지 않는 날짜는 정규식만으로 거를 수 없음
const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

/** 사진의 원본 유형(서버 업로드 계약의 `sourceType`) */
export const PHOTO_SOURCE_TYPES = ['CAMERA', 'SCREENSHOT', 'SAVED_IMAGE', 'UNKNOWN'] as const;
export type PhotoSourceType = (typeof PHOTO_SOURCE_TYPES)[number];

// 서버가 받는 UTC 오프셋 범위(-12:00 ~ +14:00)
const isSupportedUtcOffset = (value: string) => {
  const minutes = Number(value.slice(1, 3)) * 60 + Number(value.slice(4, 6));
  const signed = value.startsWith('-') ? -minutes : minutes;
  return signed >= -12 * 60 && signed <= 14 * 60;
};

/**
 * 갤러리·카메라에서 고른 사진 한 장의 정보. 사진 데이터는 담지 않고, `readPickedPhoto`로 하나씩 읽어 감
 * 촬영 날짜·시각은 사진 파일의 촬영 정보(EXIF)에서 쉘이 꺼낸 현지 값이고, 위치 정보는 어디에도 담지 않음
 * 시각은 날짜 없이 보낼 수 없음(서버 규칙)
 */
export const pickedPhotoSchema = z
  .object({
    id: z.string().min(1),
    /** 촬영 현지 날짜(yyyy-MM-dd). 알 수 없으면 없음 */
    capturedDate: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
      .optional(),
    /** 촬영 현지 시각(HH:mm:ss). 알 수 없으면 없음 */
    capturedTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
      .optional(),
    /** 촬영 시각의 UTC 오프셋(`+09:00`, -12:00~+14:00). 알 수 없으면 없음(서버는 한국 시간으로 봄) */
    capturedUtcOffset: z
      .string()
      .regex(/^[+-]\d{2}:[0-5]\d$/)
      .refine(isSupportedUtcOffset, 'UTC 오프셋은 -12:00 ~ +14:00이어야 해요.')
      .optional(),
    /** 원본 유형. 이전 쉘은 보내지 않음(서버에는 값 없음으로 저장됨). 판단하지 못하면 UNKNOWN */
    sourceType: z.enum(PHOTO_SOURCE_TYPES).optional(),
  })
  .strict()
  .refine((photo) => photo.capturedTime === undefined || photo.capturedDate !== undefined, {
    message: 'capturedTime은 capturedDate 없이 보낼 수 없어요.',
  })
  .refine((photo) => photo.capturedDate === undefined || isRealDate(photo.capturedDate), {
    message: 'capturedDate가 실제 날짜가 아니에요.',
  });
export type PickedPhoto = z.infer<typeof pickedPhotoSchema>;

/** `readPickedPhoto`에 넘기는 사진 id */
export const pickedPhotoIdSchema = z.string().min(1).max(64);

/** `releasePickedPhotos`에 넘기는 사진 id 목록(여러 선택을 한꺼번에 놓아 줄 수 있어 50장보다 넉넉히) */
export const pickedPhotoIdsSchema = z.array(pickedPhotoIdSchema).max(500);

/**
 * 사진 선택·촬영 결과. `canceled`는 사용자가 창을 닫은 것, `denied`는 카메라 권한이 거부된 것
 * (사진 전용 시스템 선택기는 앨범 권한을 요청하지 않아 갤러리 선택에서는 `denied`가 없음)
 */
export const pickPhotosResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('picked'),
    photos: z.array(pickedPhotoSchema).min(1).max(MAX_PICKED_PHOTOS),
  }),
  z.object({ status: z.literal('canceled') }),
  z.object({ status: z.literal('denied') }),
]);
export type PickPhotosResult = z.infer<typeof pickPhotosResultSchema>;

/** 갤러리 여러 장 선택 옵션. `limit`은 1~50장(기본 50장) */
export const pickGalleryImagesOptionsSchema = z
  .object({ limit: z.number().int().min(1).max(MAX_PICKED_PHOTOS).optional() })
  .strict()
  .optional();
export type PickGalleryImagesOptions = z.infer<typeof pickGalleryImagesOptionsSchema>;

/**
 * 업로드용으로 가공한 사진 한 장: 긴 변 2560px 이하 JPEG, 위치를 포함한 모든 메타데이터를 지운 이미지
 * 서버는 JPEG만 받음(기능명세서 3.2.2, 업로드 API 명세)
 */
export const uploadImageSchema = z.object({
  dataUrl: z
    .string()
    .max(MAX_UPLOAD_IMAGE_DATA_URL)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
  /**
   * 가공 전 원본 파일의 SHA-256(소문자 hex 64자). 서버가 같은 원본 사진을 판별하는 데 씀
   * 가공(리사이즈·재인코딩) 결과는 같은 원본이어도 기기마다 바이트가 달라 가공본 해시로는 합쳐지지 않으므로 가공 전 파일로 계산함. 계산하지 못하면 없음
   */
  originalFileHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
});
export type UploadImage = z.infer<typeof uploadImageSchema>;

/** 앨범에 한 번에 저장할 수 있는 사진 수(선택 모드 최대 선택 수와 같음, 기능명세서 3.3.3) */
export const MAX_SAVE_IMAGES = MAX_PICKED_PHOTOS;

// IPv4 주소 표기(점 숫자 4개)나 IPv6 주소([…])는 사설망·loopback·link-local 주소일 수 있어 호스트 이름이 아닌 값은 거절
const isIpLiteral = (hostname: string) =>
  hostname.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

const isPublicHostname = (hostname: string) =>
  hostname.includes('.') &&
  !isIpLiteral(hostname) &&
  hostname !== 'localhost' &&
  !/\.(local|localhost|internal|lan|home)$/.test(hostname);

/**
 * 앨범 저장 주소가 쉘이 내려받아도 되는 모양인지: https, 계정 정보(`user:pass@`) 없음, 공개 도메인 이름 호스트
 * 쉘은 웹이 준 주소를 그대로 내려받으므로, 웹 쪽 코드가 오염돼도 사설망·기기 안의 주소를 요청하지 못하게 막음
 * 허용 호스트 목록은 운영 이미지 호스트가 정해진 뒤에 쉘 설정으로 좁힐 수 있음
 */
export const isSavableImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      isPublicHostname(url.hostname)
    );
  } catch {
    return false;
  }
};

/** 앨범에 저장할 이미지 주소. 쉘이 내려받으므로 공개 https 주소만 허용 */
export const saveImageUrlSchema = z
  .string()
  .max(2048)
  .refine(isSavableImageUrl, { message: '공개 https 주소만 저장할 수 있어요.' });

export const saveImageUrlsSchema = z.array(saveImageUrlSchema).min(1).max(MAX_SAVE_IMAGES);

/**
 * 앨범 저장 결과. `denied`는 사진 저장 권한이 거부된 것(설정에서 허용해야 함)이고, `saved`는 요청한 주소 순서대로 사진별 성공 여부
 * 일부만 저장될 수 있으며, 사진 데이터는 웹으로 넘기지 않음
 */
export const saveImagesToAlbumResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('saved'), results: z.array(z.boolean()) }),
  z.object({ status: z.literal('denied') }),
]);
export type SaveImagesToAlbumResult = z.infer<typeof saveImagesToAlbumResultSchema>;

/** 가입할 때 요청하는 시스템 권한 */
export const permissionKindSchema = z.enum(['photo', 'camera', 'notification']);
export type PermissionKind = z.infer<typeof permissionKindSchema>;

/** 요청 뒤의 권한 상태. 허용도 거부도 아직 정하지 않았으면 `undetermined` */
export const permissionStatusSchema = z.enum(['granted', 'denied', 'undetermined']);
export type PermissionStatus = z.infer<typeof permissionStatusSchema>;

/**
 * 푸시 기기 등록 정보(서버 `PUT /members/me/push-devices/{installationId}` 계약과 같은 규칙)
 * 서버 계약이 APNs 기준이라 iOS 쉘만 만듦: 토큰은 16진수 짝수 길이 2~4096자, 환경은 `SANDBOX`·`PRODUCTION`
 * 토큰은 기기를 가리키는 값이라 웹은 서버로 보내기만 하고 저장·로그·오류 메시지에 넣지 않음
 */
export const pushDeviceTokenSchema = z
  .string()
  .min(2)
  .max(4096)
  .regex(/^(?:[0-9a-fA-F]{2})+$/);
export const pushEnvironmentSchema = z.enum(['SANDBOX', 'PRODUCTION']);
/** OS 알림 권한 상태(서버 `authorizationStatus`). 거부여도 등록하며 서버가 푸시를 보내지 않음 */
export const pushAuthorizationStatusSchema = z.enum([
  'NOT_DETERMINED',
  'DENIED',
  'AUTHORIZED',
  'PROVISIONAL',
]);
export const pushDeviceRegistrationSchema = z.object({
  /** 설치별 UUID. 쉘이 처음 만들어 저장하고 계정이 바뀌어도 같음 */
  installationId: z.uuid(),
  deviceToken: pushDeviceTokenSchema,
  environment: pushEnvironmentSchema,
  authorizationStatus: pushAuthorizationStatusSchema,
});
export type PushDeviceRegistration = z.infer<typeof pushDeviceRegistrationSchema>;

/** 쉘이 네이티브 SDK로 로그인시키는 소셜 서비스 */
export const socialProviderSchema = z.enum(['kakao', 'google', 'apple']);
export type SocialProvider = z.infer<typeof socialProviderSchema>;

/**
 * 소셜 로그인 결과: 서버 로그인에 쓸 ID 토큰을 웹에 넘기고, 서버 호출과 쿠키 저장은 웹 BFF가 맡음
 * 사용자가 로그인 창을 닫으면 실패가 아니라 `cancelled`, SDK·네트워크 오류는 reject
 * 카카오·Apple은 서버가 nonce를 요구하므로 함께 전달(인증 BFF 입력 검증과 같은 규칙)
 */
export const socialLoginResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('success'),
      provider: socialProviderSchema,
      idToken: z.string().min(1),
      nonce: z.string().min(1).optional(),
    })
    .refine((result) => result.provider === 'google' || result.nonce !== undefined, {
      message: 'Apple·Kakao 로그인에는 nonce가 필요합니다.',
      path: ['nonce'],
    }),
  z.object({ status: z.literal('cancelled') }),
]);
export type SocialLoginResult = z.infer<typeof socialLoginResultSchema>;

/**
 * 탈퇴 전 Apple 재인증 결과: 서버가 Apple 연결을 끊는 데 쓰는 일회용 인증 코드(서버 `WithdrawalRequest.appleAuthorizationCode`, 최대 4096자)
 * 사용자가 창을 닫으면 실패가 아니라 `cancelled`, SDK 오류는 reject. 코드는 로그·오류에 남기지 않음
 */
export const appleAuthorizationResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), authorizationCode: z.string().min(1).max(4096) }),
  z.object({ status: z.literal('cancelled') }),
]);
export type AppleAuthorizationResult = z.infer<typeof appleAuthorizationResultSchema>;

/**
 * 클립보드로 주고받는 텍스트: 초대 링크·주소 수준의 짧은 문자열만 허용(큰 데이터가 브리지로 오가지 않게 상한을 둠)
 * 복사 입력과 읽기 결과 모두 같은 규칙으로 검증하고, 규칙을 어기면 복사는 실패, 읽기는 비어 있는 것으로 취급
 */
export const clipboardTextSchema = z.string().min(1).max(2048);

export const shareParamsSchema = z.object({
  url: z.url(),
  title: z.string().optional(),
});

export type ShareParams = z.infer<typeof shareParamsSchema>;

/** iOS 시스템 탭 바 항목: 라벨·경로는 웹, 아이콘은 쉘이 탭 ID로 결정(docs/decisions/records/012-ios-system-tab-bar.md) */
export const nativeTabBarItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** 탭 WebView가 여는 웹 경로(같은 출처의 절대 경로만 허용) */
  path: z
    .string()
    .startsWith('/')
    // 실제로 풀어 본 출처로 판정(URL 파서가 탭·개행을 지워 `/\t/evil.test`를 `//evil.test`로 읽는 우회 차단)
    .refine((path) => new URL(path, 'https://app.invalid').origin === 'https://app.invalid', {
      message: '같은 출처의 절대 경로여야 합니다.',
    }),
});

export const setNativeTabBarParamsSchema = z.object({
  items: z
    .array(nativeTabBarItemSchema)
    .min(2)
    .max(5)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
      message: '탭 ID는 서로 달라야 합니다.',
    }),
  selectedId: z.string().min(1),
  /** true면 탭 화면 종료 후 하나의 WebView로 복귀(로그아웃 등). 기본값은 표시 */
  hidden: z.boolean().optional(),
});

/** 탭 WebView를 가리키는 탭 ID(쉘이 넣어 준 `bunch-shell-tab` 값) */
const tabIdSchema = z.string().min(1).max(32);

/**
 * 탭 WebView가 자기 탭의 탭 바 표시 여부를 알림(#481). 쉘은 탭마다 저장하고 지금 선택된 탭의 값만 적용
 * 탭 ID는 쉘이 탭 WebView에 넣어 준 값(`sessionStorage`의 `bunch-shell-tab`)
 */
export const nativeTabBarVisibilitySchema = z.object({
  tab: tabIdSchema,
  visible: z.boolean(),
});

export type NativeTabBarVisibilityParams = z.infer<typeof nativeTabBarVisibilitySchema>;
export type NativeTabBarItem = z.infer<typeof nativeTabBarItemSchema>;
export type SetNativeTabBarParams = z.infer<typeof setNativeTabBarParamsSchema>;

/**
 * iOS 26 이상 쉘이 탭 화면 위에 네이티브 Liquid Glass로 그리는 플로팅 버튼. `button`이 null이면 그 탭의 버튼을 지움
 * 탭마다 하나만 두고, 쉘은 웹이 알려 준 탭 화면에만 그림(다른 탭 WebView의 요청이 서로 덮어쓰지 않게)
 */
export const setNativeFloatingButtonParamsSchema = z
  .object({
    tab: z.string().min(1),
    button: z
      .object({
        /** 웹 `FloatingButton`의 아이콘과 같은 이름 */
        icon: z.enum(['add', 'more']),
        /** 아이콘만 있는 버튼의 접근성 이름 */
        label: z.string().min(1).max(40),
        /** 누를 수 없음(예: 고른 사진이 없을 때의 「⋯」). 흐리게 그리고 눌림을 보내지 않음 */
        disabled: z.boolean().optional(),
        /** 버튼이 연 메뉴가 열려 있는지(VoiceOver가 읽음). 메뉴를 열지 않는 버튼은 없음 */
        expanded: z.boolean().optional(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type SetNativeFloatingButtonParams = z.infer<typeof setNativeFloatingButtonParamsSchema>;

/**
 * 다른 탭 WebView에 알릴 변화(탭마다 웹 상태가 따로라 알리지 않으면 다른 탭이 이전 상태로 남음)
 * `meChanged`: 내 정보(지금 번치·닉네임·프로필 사진)가 바뀜. `from`은 보낸 탭 ID(보낸 탭은 받지 않음)
 */
export const nativeTabEventSchema = z
  .object({ type: z.enum(['meChanged']), from: z.string().min(1).max(32) })
  .strict();
export type NativeTabEvent = z.infer<typeof nativeTabEventSchema>;

/** 네이티브 플로팅 버튼 눌림. 모든 탭 WebView에 보내므로 웹이 `tab`으로 자기 버튼인지 가림 */
export const nativeFloatingButtonPressSchema = z.object({ tab: z.string().min(1) }).strict();
export type NativeFloatingButtonPress = z.infer<typeof nativeFloatingButtonPressSchema>;

/**
 * 네이티브 플로팅 버튼이 떠 있는 탭 화면의 토스트를 쉘이 그림(#503, 결정 기록 030). 버튼이 WebView 위에 있어 웹 토스트가 그 뒤에 깔리기 때문
 * 모양·노출 시간·대체 규칙은 디자인 시스템 Toast와 같음. `id`는 웹이 정하고 액션 눌림(`nativeToastAction`)에서 돌려받음
 * `duration`이 null이면 자동으로 닫히지 않음
 */
export const showNativeToastParamsSchema = z
  .object({
    tab: tabIdSchema,
    id: z.string().min(1).max(64),
    message: z.string().min(1).max(200),
    icon: z.enum(['success']).optional(),
    action: z
      .object({ label: z.string().min(1).max(20) })
      .strict()
      .optional(),
    duration: z.number().int().min(1).max(60_000).nullable(),
    /** false면 내용 폭으로 가운데(웹 `fullWidth: false`) */
    fullWidth: z.boolean(),
  })
  .strict();
export type ShowNativeToastParams = z.infer<typeof showNativeToastParamsSchema>;

/** 그 탭의 네이티브 토스트를 닫음(웹이 웹 토스트로 바꿔 띄우거나 버튼이 사라질 때) */
export const hideNativeToastParamsSchema = z.object({ tab: tabIdSchema }).strict();
export type HideNativeToastParams = z.infer<typeof hideNativeToastParamsSchema>;

/** 네이티브 토스트의 액션 버튼을 누름. 모든 탭 WebView에 보내므로 웹이 `tab`·`id`로 자기 것만 처리 */
export const nativeToastActionSchema = z
  .object({ tab: tabIdSchema, id: z.string().min(1).max(64) })
  .strict();
export type NativeToastAction = z.infer<typeof nativeToastActionSchema>;

const positiveIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/**
 * 푸시를 눌러 앱을 연 알림(서버 APNs payload의 `target`·`notificationId`, 명세 072 피드 알림 푸시 payload)
 * 웹이 알림 목록과 같은 경로로 이동하고 `notificationId`가 있으면 `target.bunchId`(수신함) 번치로 읽음 처리. 수신함 없는 푸시(내보내짐·삭제)는 null
 */
export const pushOpenSchema = z
  .object({
    target: z
      .object({
        kind: z.string().min(1).max(64),
        bunchId: positiveIdSchema,
        bundleId: positiveIdSchema.optional(),
        noticeId: positiveIdSchema.optional(),
        targetBunchId: positiveIdSchema.optional(),
        sourceBunchId: positiveIdSchema.optional(),
        commentId: positiveIdSchema.optional(),
      })
      .strict(),
    notificationId: positiveIdSchema.nullable(),
  })
  .strict();
export type PushOpen = z.infer<typeof pushOpenSchema>;

/** 푸시를 눌러 앱을 열었음(값은 웹이 `takeOpenedPush`로 가져감). 모든 WebView에 보내고 보이는 WebView만 가져감 */
export const pushOpenedSchema = z.object({}).strict();
export type PushOpened = z.infer<typeof pushOpenedSchema>;

/**
 * 설치된 앱의 버전(`1.2.0`, App Store 버전)과 빌드 번호(`3`). 웹이 최소 버전과 비교해 업데이트 모달을 띄움(#577)
 * 같은 형식을 웹 route(`/api/app-version`)의 입력 검증에도 씀
 */
export const appVersionSchema = z
  .object({
    version: z.string().regex(/^\d{1,4}(\.\d{1,4}){0,2}$/),
    build: z.string().regex(/^\d{1,9}$/),
  })
  .strict();
export type AppVersion = z.infer<typeof appVersionSchema>;

/** 화면 사건에 맞춘 햅틱 종류. `success`: 완료 축하(컨페티), `tap`: 가벼운 누름(좋아요·콕하기·피드 끝) */
export const hapticKindSchema = z.enum(['success', 'tap']);
export type HapticKind = z.infer<typeof hapticKindSchema>;

/** 이미 선택된 탭을 다시 누름(웹이 지금 화면을 맨 위로). 모든 탭 WebView에 보내므로 웹이 `tab`으로 자기 탭인지 가림 */
export const nativeTabReselectSchema = z.object({ tab: tabIdSchema }).strict();
export type NativeTabReselect = z.infer<typeof nativeTabReselectSchema>;

/** 이미 선택된 탭을 꾹 누름(번치 탭은 전환 시트). 모든 탭 WebView에 보내므로 웹이 `tab`으로 자기 탭인지 가림 */
export const nativeTabLongPressSchema = z.object({ tab: tabIdSchema }).strict();
export type NativeTabLongPress = z.infer<typeof nativeTabLongPressSchema>;

/**
 * iOS 키보드가 움직이기 직전 알림(keyboardWillChangeFrame, #568). 웹이 같은 시간 동안 앱 틀 높이를 키보드에 맞춤
 * `height`는 화면 아래에서 키보드가 덮는 높이(pt, 닫힘은 0), `duration`은 키보드 애니메이션 시간(ms). 모든 WebView에 보내므로 보이는 화면만 따름
 */
export const nativeKeyboardSchema = z
  .object({ height: z.number().min(0).max(2000), duration: z.number().min(0).max(1000) })
  .strict();
export type NativeKeyboard = z.infer<typeof nativeKeyboardSchema>;

// @webview-bridge의 이벤트 schema에 필요한 validate 인터페이스 적용
const validator = <T extends z.ZodType>(schema: T) => ({
  validate: (data: unknown): z.infer<T> => schema.parse(data),
});

/** `createWebView({ postMessageSchema })`와 `linkBridge`가 같이 쓰는 네이티브 → 웹 이벤트 목록 */
export const appPostMessageSchema = {
  nativeFloatingButtonPress: validator(nativeFloatingButtonPressSchema),
  nativeKeyboard: validator(nativeKeyboardSchema),
  nativeTabEvent: validator(nativeTabEventSchema),
  nativeTabReselect: validator(nativeTabReselectSchema),
  nativeTabLongPress: validator(nativeTabLongPressSchema),
  nativeToastAction: validator(nativeToastActionSchema),
  pushOpened: validator(pushOpenedSchema),
};

export type AppPostMessageSchema = typeof appPostMessageSchema;
