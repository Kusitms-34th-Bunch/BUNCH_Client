import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSyncExternalStore } from 'react';
import { TAB_ICONS } from '../../src/tabs/tab-icons';
import { TAB_IDS } from '../../src/tabs/tabs';
import { tabsStore } from '../../src/tabs/tabs-store';

// 웹 막대(BottomNavigation)와 같은 디자인 시스템 값. RN은 CSS 변수를 못 써 값을 옮긴다
// 선택 text-primary(gray-900), 미선택 text-tertiary(gray-600), 라벨 caption-1-regular(Pretendard Regular 12px)
// 글꼴은 app.json의 expo-font가 앱에 넣고 iOS는 PostScript 이름으로 찾는다
const TEXT_PRIMARY = '#121212';
const TEXT_TERTIARY = '#535a61';
const LABEL = { fontFamily: 'Pretendard-Regular', fontSize: 12 } as const;

/** iOS 시스템 탭 바(iOS 26 이상은 Liquid Glass). 라벨은 웹이 보낸 항목, 아이콘은 쉘의 디자인 시스템 아이콘. 항목이 없는 탭은 숨긴다 */
export default function TabsLayout() {
  const tabs = useSyncExternalStore(tabsStore.subscribe, tabsStore.get);
  // 웹이 탭 항목을 보내기 전(Fast Refresh·직접 진입)에는 첫 화면으로 복귀
  if (!tabs) return <Redirect href="/" />;

  return (
    <NativeTabs
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
