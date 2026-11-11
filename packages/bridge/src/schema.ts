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

// 업로드용 사진 전송 상한: base64 약 14MiB(JPEG 약 10MiB). 긴 변 2560px JPEG는 보통 수 MB이고 쉘이 목표 크기(약 5.5MiB) 아래로 맞추므로 이 값은 출력 검증용 최대치
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
});
export type UploadImage = z.infer<typeof uploadImageSchema>;

/** 가입할 때 요청하는 시스템 권한 */
export const permissionKindSchema = z.enum(['photo', 'camera', 'notification']);
export type PermissionKind = z.infer<typeof permissionKindSchema>;

/** 요청 뒤의 권한 상태. 허용도 거부도 아직 정하지 않았으면 `undetermined` */
export const permissionStatusSchema = z.enum(['granted', 'denied', 'undetermined']);
export type PermissionStatus = z.infer<typeof permissionStatusSchema>;

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

export type NativeTabBarItem = z.infer<typeof nativeTabBarItemSchema>;
export type SetNativeTabBarParams = z.infer<typeof setNativeTabBarParamsSchema>;

/** `createWebView({ postMessageSchema })`와 `linkBridge`가 같이 쓰는 네이티브 → 웹 이벤트 목록. 탭 선택은 시스템 탭 바가 처리해 현재 없음 */
export const appPostMessageSchema = {};

export type AppPostMessageSchema = typeof appPostMessageSchema;
