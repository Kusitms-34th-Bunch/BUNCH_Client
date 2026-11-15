import type { SetNativeFloatingButtonParams } from '@app/bridge';
import { GlassView } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Button = NonNullable<SetNativeFloatingButtonParams['button']>;

// 웹 FloatingButton과 같은 값(RN은 CSS 변수 미지원): 52px 원형, 오른쪽 s8(16px), 아래 막대 위 10px(--main-tab-bar-float-gap)
const SIZE = 52;
const RIGHT = 16;
const FLOAT_GAP = 10;
// icon-primary(gray-900), 누를 수 없을 때 icon-disabled(gray-400)와 opacity-disabled(40%)
const ICON_COLOR = '#121212';
const ICON_DISABLED_COLOR = '#bcbec2';
const DISABLED_OPACITY = 0.4;

/** 디자인 시스템 아이콘(Large 24px, 선 1.5px)을 View로 그린 것: 더하기는 가로·세로 선, 더보기는 점 세 개 */
function Icon({ name, color }: { name: Button['icon']; color: string }) {
  if (name === 'add')
    return (
      <View style={styles.icon}>
        <View style={[styles.line, { width: 15.5, height: 1.5, backgroundColor: color }]} />
        <View
          style={[
            styles.line,
            styles.absolute,
            { width: 1.5, height: 15.5, backgroundColor: color },
          ]}
        />
      </View>
    );
  return (
    <View style={[styles.icon, styles.dots]}>
      {[0, 1, 2].map((dot) => (
        <View key={dot} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** iOS 26 Liquid Glass 플로팅 버튼(누르면 시스템 반응). 위치는 탭 바 위, 탭 WebView 위에 겹침 */
export function NativeFloatingButton({ button, onPress }: { button: Button; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={button.label}
      accessibilityState={{ disabled: button.disabled ?? false, expanded: button.expanded }}
      disabled={button.disabled}
      onPress={onPress}
      style={[
        styles.wrap,
        { bottom: insets.bottom + FLOAT_GAP },
        button.disabled && { opacity: DISABLED_OPACITY },
      ]}
    >
      <GlassView isInteractive={!button.disabled} glassEffectStyle="regular" style={styles.glass}>
        <Icon name={button.icon} color={button.disabled ? ICON_DISABLED_COLOR : ICON_COLOR} />
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: RIGHT, width: SIZE, height: SIZE },
  glass: { flex: 1, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute' },
  line: { borderRadius: 1 },
  dots: { flexDirection: 'row', gap: 3.5 },
  dot: { width: 3.5, height: 3.5, borderRadius: 1.75 },
});
