import { z } from 'zod';

// 미리보기용 전송 상한: base64 약 4MiB(원본 약 3MiB)
export const galleryImageSchema = z.object({
  dataUrl: z
    .string()
    .max(4 * 1024 * 1024)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

/** 가입할 때 요청하는 시스템 권한 */
export const permissionKindSchema = z.enum(['photo', 'camera', 'notification']);
export type PermissionKind = z.infer<typeof permissionKindSchema>;

/** 요청 뒤의 권한 상태. 허용도 거부도 아직 정하지 않았으면 `undetermined` */
export const permissionStatusSchema = z.enum(['granted', 'denied', 'undetermined']);
export type PermissionStatus = z.infer<typeof permissionStatusSchema>;

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
