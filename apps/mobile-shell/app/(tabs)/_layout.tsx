import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSyncExternalStore } from 'react';
import { TAB_ICONS } from '../../src/tabs/tab-icons';
import { TAB_IDS } from '../../src/tabs/tabs';
import { tabsStore } from '../../src/tabs/tabs-store';
import { TOAST_FONTS } from '../../src/toast/fonts';
import { postMessage } from '../../src/web-view/AppWebView';

// 선택 색만 디자인 시스템 text-primary 복사(RN은 CSS 변수 미지원)
// 라벨 글꼴·미선택 색은 지정하지 않음: iOS 26 탭 바가 선택된 적 없는 항목의 Pretendard 라벨을 밀고 잘라 그림(#462)
const TEXT_PRIMARY = '#121212';

// 탭 햅틱은 쉘의 네이티브 모듈(modules/tab-crossfade)이 울리지만 Expo Go에는 그 모듈이 없어 JS로 대신 울림
// 개발·배포 앱에서 함께 울리면 두 번 나므로 Expo Go일 때만
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// 이미 보고 있는 탭을 다시 누르면 그 탭 웹에 알려 지금 화면을 맨 위로(웹 스크롤은 WebView 안의 요소라 시스템 맨 위로가 닿지 않음)
const screenListeners = ({
  navigation,
  route,
}: {
  navigation: { isFocused: () => boolean };
  route: { name: string };
}) => ({
  tabPress: () => {
    if (inExpoGo) void Haptics.selectionAsync().catch(() => {});
    if (navigation.isFocused()) {
      postMessage('nativeTabReselect', { tab: route.name }, { broadcast: true });
    }
  },
});

/** iOS 시스템 탭 바(iOS 26 이상은 Liquid Glass). 라벨은 웹이 보낸 항목, 아이콘은 쉘의 디자인 시스템 아이콘. 항목이 없는 탭은 숨김 */
export default function TabsLayout() {
  const tabs = useSyncExternalStore(tabsStore.subscribe, tabsStore.get);
  // 네이티브 토스트 글꼴을 탭 화면이 열릴 때 미리 불러 둠(첫 토스트에서 글꼴이 바뀌어 보이지 않게, 결정 기록 030)
  useFonts(TOAST_FONTS);
  // 웹이 탭 항목을 보내기 전(Fast Refresh·직접 진입)에는 첫 화면으로 복귀
  if (!tabs) return <Redirect href="/" />;

  return (
    <NativeTabs
      hidden={tabs.barHidden ?? false}
      screenListeners={screenListeners}
      tintColor={TEXT_PRIMARY}
    >
      {TAB_IDS.map((id) => {
        const item = tabs.items.find((tab) => tab.id === id);
        return (
          <NativeTabs.Trigger key={id} name={id} hidden={!item}>
            <NativeTabs.Trigger.Label>{item?.label ?? id}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={TAB_ICONS[id]} renderingMode="template" />
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
