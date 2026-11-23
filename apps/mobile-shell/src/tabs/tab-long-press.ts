import { requireOptionalNativeModule } from 'expo';
import { type TabId, visibleTabAt, visibleTabIndex } from './tabs';
import { tabsStore } from './tabs-store';

type TabLongPressModule = {
  addListener: (
    _event: 'onTabLongPress',
    _listener: (_payload: { index: number }) => void,
  ) => { remove: () => void };
  setEnabledIndex: (_index: number) => void;
};

// 쉘의 네이티브 모듈(modules/tab-long-press의 TabLongPressModule). Expo Go와 이전 개발 앱에는 없음
const TabLongPress = requireOptionalNativeModule<TabLongPressModule>('TabLongPress');

/**
 * `tab`을 보고 있을 때 그 탭을 꾹 누르면 알림. 다른 탭은 네이티브가 제스처를 시작하지 않아 평소처럼 다시 누름이 감
 * 네이티브는 탭 바에 보이는 순서로 다루므로 탭 항목이 바뀔 때마다(숨긴 탭) 순서를 다시 알려 줌
 */
export function listenTabLongPress(tab: TabId, onLongPress: () => void) {
  if (!TabLongPress) return () => {};
  const syncIndex = () =>
    TabLongPress.setEnabledIndex(visibleTabIndex(tabsStore.get()?.items ?? [], tab));
  syncIndex();
  const unsubscribeTabs = tabsStore.subscribe(syncIndex);
  const subscription = TabLongPress.addListener('onTabLongPress', ({ index }) => {
    if (visibleTabAt(tabsStore.get()?.items ?? [], index) === tab) onLongPress();
  });
  return () => {
    unsubscribeTabs();
    subscription.remove();
    TabLongPress.setEnabledIndex(-1);
  };
}
