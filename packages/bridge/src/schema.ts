import { z } from 'zod';

export const shareParamsSchema = z.object({
  url: z.url(),
  title: z.string().optional(),
});

export type ShareParams = z.infer<typeof shareParamsSchema>;

/** 탭 항목과 선택 상태는 웹에서 관리: docs/decisions/records/011-bottom-navigation-glass-by-platform.md */
export const nativeTabBarItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** 선택하지 않았을 때의 iOS SF Symbol 이름, 생략 시 라벨만 표시 */
  symbol: z.string().min(1).optional(),
  /** 선택했을 때의 SF Symbol 이름, 생략 시 `symbol` 사용 */
  selectedSymbol: z.string().min(1).optional(),
});

export const setNativeTabBarParamsSchema = z.object({
  items: z.array(nativeTabBarItemSchema).min(2).max(5),
  selectedId: z.string().min(1),
  /** 막대 숨김 여부, 기본값은 표시 */
  hidden: z.boolean().optional(),
});

export type NativeTabBarItem = z.infer<typeof nativeTabBarItemSchema>;
export type SetNativeTabBarParams = z.infer<typeof setNativeTabBarParamsSchema>;

/** 네이티브 탭 선택 시 웹으로 전달하는 이벤트 */
export const nativeTabPressSchema = z.object({ id: z.string().min(1) });

export type NativeTabPress = z.infer<typeof nativeTabPressSchema>;

// @webview-bridge의 이벤트 schema에 필요한 validate 인터페이스 적용
const validator = <T extends z.ZodType>(schema: T) => ({
  validate: (data: unknown): z.infer<T> => schema.parse(data),
});

/** `createWebView({ postMessageSchema })`와 `linkBridge`가 같이 쓰는 네이티브 → 웹 이벤트 목록 */
export const appPostMessageSchema = {
  nativeTabPress: validator(nativeTabPressSchema),
};

export type AppPostMessageSchema = typeof appPostMessageSchema;
