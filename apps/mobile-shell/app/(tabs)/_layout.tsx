import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSyncExternalStore } from 'react';
import { TAB_ICONS } from '../../src/tabs/tab-icons';
import { TAB_IDS } from '../../src/tabs/tabs';
import { tabsStore } from '../../src/tabs/tabs-store';

// 웹 막대(BottomNavigation)와 같은 디자인 시스템 값 복사(RN은 CSS 변수 미지원): 선택 text-primary, 미선택 text-tertiary
// 라벨 caption-1-regular(Pretendard Regular 12px, app.json의 expo-font로 포함, iOS는 PostScript 이름으로 지정)
const TEXT_PRIMARY = '#121212';
const TEXT_TERTIARY = '#535a61';
const LABEL = { fontFamily: 'Pretendard-Regular', fontSize: 12 } as const;

// 탭 햅틱은 쉘의 네이티브 모듈(modules/tab-crossfade)이 울리지만 Expo Go에는 그 모듈이 없어 JS로 대신 울림
// 개발·배포 앱에서 함께 울리면 두 번 나므로 Expo Go일 때만
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const screenListeners = inExpoGo
  ? { tabPress: () => void Haptics.selectionAsync().catch(() => {}) }
  : undefined;

/** iOS 시스템 탭 바(iOS 26 이상은 Liquid Glass). 라벨은 웹이 보낸 항목, 아이콘은 쉘의 디자인 시스템 아이콘. 항목이 없는 탭은 숨김 */
export default function TabsLayout() {
  const tabs = useSyncExternalStore(tabsStore.subscribe, tabsStore.get);
  // 웹이 탭 항목을 보내기 전(Fast Refresh·직접 진입)에는 첫 화면으로 복귀
  if (!tabs) return <Redirect href="/" />;

  return (
    <NativeTabs
      hidden={tabs.barHidden ?? false}
      screenListeners={screenListeners}
      tintColor={TEXT_PRIMARY}
      iconColor={{ default: TEXT_TERTIARY, selected: TEXT_PRIMARY }}
      labelStyle={{
        default: { ...LABEL, color: TEXT_TERTIARY },
        selected: { ...LABEL, color: TEXT_PRIMARY },
      }}
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
