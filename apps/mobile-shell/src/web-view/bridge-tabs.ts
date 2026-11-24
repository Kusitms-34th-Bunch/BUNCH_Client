import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';
import {
  hideNativeToastParamsSchema,
  nativeTabBarVisibilitySchema,
  setNativeFloatingButtonParamsSchema,
  setNativeTabBarParamsSchema,
  showNativeToastParamsSchema,
  type AppBridgeMethods,
} from '@app/bridge';
import { waitForTabWebView } from '../splash/state';
import { floatingButtonStore } from '../tabs/floating-button-store';
import { reportTabBar } from '../tabs/tab-bar-visibility';
import { canShowTabs, isTabId } from '../tabs/tabs';
import { tabsStore } from '../tabs/tabs-store';
import { toastStore } from '../toast/toast-store';
import { WEB_URL } from './app-web-url';
import { floatingButtons } from './visible-web-view';

/** iOS 시스템 탭 바·탭 전환·네이티브 플로팅 버튼·탭 화면 토스트 bridge 처리(결정 기록 012·026·030) */
export const tabBridge = {
  // 시스템 탭 바는 iOS만 지원(그 외는 false 반환으로 웹 탭 막대 사용)
  setNativeTabBar: (params) => {
    if (Platform.OS !== 'ios') return Promise.resolve(false);
    const next = setNativeTabBarParamsSchema.parse(params);
    if (next.hidden) {
      if (tabsStore.get()) {
        // 화면 이동 뒤 비움(탭이 모두 숨은 막대가 한 프레임 보이는 것 방지)
        router.replace('/');
        tabsStore.set(null);
        floatingButtonStore.clear();
        toastStore.clear();
      }
      return Promise.resolve(true);
    }
    if (!canShowTabs(next, WEB_URL)) return Promise.resolve(false);
    // 이미 탭 화면이면 탭 WebView 4개의 같은 요청에 화면 이동 생략, 항목이 같으면 다시 그리기 생략
    const current = tabsStore.get();
    if (!current) {
      // 이 요청을 보낸 첫 화면 WebView는 곧 버려지므로 스플래시는 탭 WebView의 appReady로 닫음
      waitForTabWebView();
      tabsStore.set(next);
      router.replace(`/${next.selectedId}` as Href);
    } else if (JSON.stringify(current.items) !== JSON.stringify(next.items)) {
      // 탭 바 표시 상태(탭별 값·선택 탭)는 그대로 둠(다른 탭 WebView가 다시 불러와도 유지)
      tabsStore.set({
        ...next,
        barHidden: current.barHidden,
        hiddenByTab: current.hiddenByTab,
        focusedTab: current.focusedTab,
      });
    }
    return Promise.resolve(true);
  },
  // 탭 밖 화면을 같은 탭 WebView에서 여는 동안 탭 바만 숨김(탭 상태 유지, 결정 기록 012). 웹은 화면에 보이는 WebView만 보냄
  // 이전 웹(탭 ID를 보내지 않음)용: 화면에 보이는 WebView가 보낸 값으로 지금 탭 바만 바꿈
  // 탭별로 저장하지 않음(탭 전환과 메시지 순서가 엇갈리면 다른 탭에 저장될 수 있음)
  setNativeTabBarVisible: (visible) => {
    const current = tabsStore.get();
    if (Platform.OS !== 'ios' || !current || typeof visible !== 'boolean')
      return Promise.resolve(false);
    if (current.barHidden === !visible) return Promise.resolve(true);
    tabsStore.set({ ...current, barHidden: !visible });
    return Promise.resolve(true);
  },
  // 탭 WebView가 자기 탭의 값을 알림(#481): 탭마다 저장하고 선택된 탭의 값만 탭 바에 적용(뒤의 탭이 지금 탭 바를 바꾸지 않음)
  setNativeTabBarVisibleFor: (params) => {
    const current = tabsStore.get();
    const parsed = nativeTabBarVisibilitySchema.safeParse(params);
    if (Platform.OS !== 'ios' || !current || !parsed.success || !isTabId(parsed.data.tab))
      return Promise.resolve(false);
    const initial = isTabId(current.selectedId) ? current.selectedId : parsed.data.tab;
    const next = reportTabBar(current, parsed.data.tab, parsed.data.visible, initial);
    if (next !== current) tabsStore.set(next);
    return Promise.resolve(true);
  },
  // 다른 탭으로 전환(웹이 다른 탭 첫 화면으로 가려 할 때, 6.1.2 상세 동작 3). 그 탭 WebView는 보던 화면 그대로
  selectNativeTab: (id) => {
    const current = tabsStore.get();
    if (
      Platform.OS !== 'ios' ||
      !current ||
      typeof id !== 'string' ||
      !isTabId(id) ||
      !current.items.some((item) => item.id === id)
    )
      return Promise.resolve(false);
    router.navigate(`/${id}` as Href);
    return Promise.resolve(true);
  },
  // iOS 26 이상 탭 화면에서만 네이티브 Liquid Glass 버튼(그 밖은 false로 웹 버튼 유지). 지우기는 항상 받음
  setNativeFloatingButton: (params) => {
    const { tab, button } = setNativeFloatingButtonParamsSchema.parse(params);
    if (!isTabId(tab)) return Promise.resolve(false);
    if (!button) {
      floatingButtons.request(tab, null);
      return Promise.resolve(true);
    }
    if (Platform.OS !== 'ios' || !isLiquidGlassAvailable() || !tabsStore.get())
      return Promise.resolve(false);
    floatingButtons.request(tab, button);
    return Promise.resolve(true);
  },
  // 네이티브 플로팅 버튼이 떠 있는 탭의 토스트(#503, 결정 기록 030). 탭 화면이 있는 iOS에서만, 그 밖은 false로 웹 토스트
  showNativeToast: (params) => {
    const parsed = showNativeToastParamsSchema.safeParse(params);
    if (Platform.OS !== 'ios' || !tabsStore.get() || !parsed.success || !isTabId(parsed.data.tab))
      return Promise.resolve(false);
    const { tab, ...toast } = parsed.data;
    toastStore.show(tab, toast);
    return Promise.resolve(true);
  },
  hideNativeToast: (params) => {
    const parsed = hideNativeToastParamsSchema.safeParse(params);
    if (!parsed.success || !isTabId(parsed.data.tab)) return Promise.resolve(false);
    toastStore.hide(parsed.data.tab);
    return Promise.resolve(true);
  },
} satisfies Partial<AppBridgeMethods>;
