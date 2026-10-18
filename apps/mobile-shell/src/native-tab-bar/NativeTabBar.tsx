import type { NativeTabBarItem } from '@app/bridge';
import { GlassView } from 'expo-glass-effect';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { getTabBarLayout } from './native-tab-bar';
import { useNativeTabBarGesture } from './useNativeTabBarGesture';

type NativeTabBarProps = {
  items: NativeTabBarItem[];
  selectedId: string;
  bottomInset: number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  onPress: (id: string) => void;
};

// React Native의 CSS 변수 미지원으로 디자인 시스템 토큰 값을 직접 적용
// 스타일 선택 근거: docs/architecture/mobile-shell.md
const COLOR_TEXT_PRIMARY = '#121212'; // text-primary(gray-900)
const COLOR_TEXT_TERTIARY = '#535a61'; // text-tertiary(gray-600)
const COLOR_SELECTED_PILL = 'rgba(120,120,128,0.16)'; // 시스템 탭 바의 선택 알약 색(iOS), 웹은 surface-secondary(gray-100 #f7f7f8)
const RADIUS_FULL = 999; // radius-full
const SPACING_BAR_PADDING = 4; // spacing-s2
const SPACING_BAR_SIDE = 16; // 막대 좌우 여백(웹 막대와 같은 폭을 위한 값)
const SPACING_ITEM_GAP = 4; // spacing-s2
const ICON_SIZE = 24; // 아이콘 24px(Icon-L)
const PILL_MAX_WIDTH = 80; // 선택 알약 폭(웹 w-s24)

export function NativeTabBar({ items, selectedId, bottomInset, onPress }: NativeTabBarProps) {
  const layout = getTabBarLayout(bottomInset);
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const { rowRef, area, itemWidth, pillX, pillScale, visualIndex, rowProps } =
    useNativeTabBarGesture({ items, selectedIndex, onSelect: onPress });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: layout.bottom }]}>
      <GlassView glassEffectStyle="regular" style={[styles.bar, { height: layout.height }]}>
        <View ref={rowRef} style={styles.row} accessibilityRole="tablist" {...rowProps}>
          {selectedIndex >= 0 && itemWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pillSlot,
                { width: itemWidth, height: area.height, transform: [{ translateX: pillX }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.pill,
                  { width: Math.min(PILL_MAX_WIDTH, itemWidth), transform: [{ scale: pillScale }] },
                ]}
              />
            </Animated.View>
          ) : null}
          {items.map((item, index) => {
            const isActive = index === visualIndex;
            const symbol = isActive ? (item.selectedSymbol ?? item.symbol) : item.symbol;
            return (
              // PanResponder와 별도로 보조 기술의 탭 선택 지원
              <View
                key={item.id}
                accessible
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: item.id === selectedId }}
                onAccessibilityTap={() => onPress(item.id)}
                style={styles.tab}
              >
                {symbol ? (
                  <SymbolView
                    // shortcut: 기기별 SF Symbol 존재 여부는 미검증, 아이콘 계약 확정 시 허용 목록 검증으로 교체
                    name={symbol as SFSymbol}
                    size={ICON_SIZE}
                    tintColor={COLOR_TEXT_PRIMARY}
                  />
                ) : null}
                <Text style={[styles.label, isActive ? styles.labelSelected : styles.labelMuted]}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: SPACING_BAR_SIDE, right: SPACING_BAR_SIDE },
  bar: { borderRadius: RADIUS_FULL, padding: SPACING_BAR_PADDING },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING_ITEM_GAP,
    borderRadius: RADIUS_FULL,
  },
  row: { flex: 1, flexDirection: 'row' },
  pillSlot: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },
  pill: { flex: 1, borderRadius: RADIUS_FULL, backgroundColor: COLOR_SELECTED_PILL },
  label: { fontSize: 12, lineHeight: 16 },
  labelSelected: { color: COLOR_TEXT_PRIMARY },
  labelMuted: { color: COLOR_TEXT_TERTIARY },
});
