import type { SetNativeFloatingButtonParams } from '@app/bridge';
import { GlassView } from 'expo-glass-effect';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isReducedMotion } from '../reduced-motion';

type Button = NonNullable<SetNativeFloatingButtonParams['button']>;

// 웹 FloatingButton과 같은 값(RN은 CSS 변수 미지원): 52px 원형, 오른쪽 s8(16px), 아래 막대 위 10px(--main-tab-bar-float-gap)
const SIZE = 52;
const RIGHT = 16;
const FLOAT_GAP = 10;
// icon-primary(gray-900), 누를 수 없을 때 icon-disabled(gray-400)와 opacity-disabled(40%)
const ICON_COLOR = '#121212';
const ICON_DISABLED_COLOR = '#bcbec2';
const DISABLED_OPACITY = 0.4;
// 탭 바가 숨거나 나타나 아래 여백이 바뀌면 웹 사진함 버튼처럼 200ms ease-out으로 따라 움직임(#583, 바로 옮기면 튀어 보임)
const MOVE_MS = 200;
const MOVE_EASING = Easing.bezier(0, 0, 0.2, 1);
// 시트가 닫혀 버튼이 다시 나타나면 탭 바가 한두 프레임 늦게 나와 여백이 바뀜. 그 직후 변화는 바로 제자리로(#583 녹화, 낮은 자리에서 올라와 보였음)
const SETTLE_MS = 300;
// 아이콘이 바뀌면(「+」→「⋯」) 아래로 내려가며 사라졌다 새 아이콘이 올라옴(#583). 유리는 그대로 두고 아이콘만 움직임
const SWAP_OUT_MS = 120;
const SWAP_IN_MS = 200;
const SWAP_SHIFT = 8;
const SWAP_EASING = Easing.bezier(0.2, 0, 0, 1);

// 디자인 시스템 Line 아이콘(Large 24px)을 탭 아이콘처럼 1x·2x·3x PNG로 옮긴 것. 색은 tintColor로 칠함
// 위치를 transform으로 움직여 누름 영역도 보이는 버튼과 함께 움직임
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ICONS: Record<Button['icon'], number> = {
  add: require('../../assets/floating-icons/line-add.png'),
  more: require('../../assets/floating-icons/line-dots.png'),
};
const ICON_NAMES = Object.keys(ICONS) as Button['icon'][];

/** iOS 26 Liquid Glass 플로팅 버튼(누르면 시스템 반응). 위치는 탭 바 위, 탭 WebView 위에 겹침 */
export function NativeFloatingButton({ button, onPress }: { button: Button; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  // 아래 여백만큼 올림. 이동 중 다시 바뀌면 지금 보이는 위치에서 이어서 감
  const lift = useRef(new Animated.Value(-insets.bottom)).current;
  const [mountedAt] = useState(Date.now);
  useEffect(() => {
    if (isReducedMotion() || Date.now() - mountedAt < SETTLE_MS) {
      lift.setValue(-insets.bottom);
      return;
    }
    const move = Animated.timing(lift, {
      toValue: -insets.bottom,
      duration: MOVE_MS,
      easing: MOVE_EASING,
      useNativeDriver: false,
    });
    move.start();
    return () => move.stop();
  }, [insets.bottom, lift, mountedAt]);

  // 1이면 아이콘이 제자리에 보임, 0이면 아래로 내려가 숨음
  const [shownIcon, setShownIcon] = useState(button.icon);
  const swap = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isReducedMotion()) {
      setShownIcon(button.icon);
      swap.setValue(1);
      return;
    }
    // 보일 아이콘이 이미 맞으면 제자리로(바꾸는 중 원래 아이콘으로 돌아와 사라지기가 끊긴 경우 포함)
    const settled = button.icon === shownIcon;
    const motion = Animated.timing(swap, {
      toValue: settled ? 1 : 0,
      duration: settled ? SWAP_IN_MS : SWAP_OUT_MS,
      easing: SWAP_EASING,
      useNativeDriver: false,
    });
    motion.start(({ finished }) => finished && !settled && setShownIcon(button.icon));
    return () => motion.stop();
  }, [button.icon, shownIcon, swap]);
  const iconShift = swap.interpolate({ inputRange: [0, 1], outputRange: [SWAP_SHIFT, 0] });

  return (
    <AnimatedPressable
      // E2E(Maestro)가 같은 이름의 웹 버튼과 구분해 이 버튼을 고르는 식별자
      testID="native-floating-button"
      accessibilityRole="button"
      accessibilityLabel={button.label}
      accessibilityState={{ disabled: button.disabled ?? false, expanded: button.expanded }}
      disabled={button.disabled}
      onPress={onPress}
      style={[
        styles.wrap,
        { transform: [{ translateY: lift }] },
        // 비활성은 유리까지 함께 흐리게(아이콘만 흐리면 누를 수 있어 보였음, #583 시뮬레이터)
        button.disabled && { opacity: DISABLED_OPACITY },
      ]}
    >
      {/* isInteractive는 처음 그릴 때만 정해져 바뀌면 key로 다시 만듦(Expo 문서) */}
      <GlassView
        key={button.disabled ? 'disabled' : 'interactive'}
        isInteractive={!button.disabled}
        glassEffectStyle="regular"
        style={styles.glass}
      />
      {/* 아이콘은 유리 위에 겹쳐 그려 아이콘 모션의 투명도가 유리에 닿지 않게 함 */}
      {ICON_NAMES.map((name) => (
        <Animated.Image
          key={name}
          pointerEvents="none"
          // 장식 이미지(이름은 버튼의 accessibilityLabel)
          accessible={false}
          source={ICONS[name]}
          style={[
            styles.icon,
            { tintColor: button.disabled ? ICON_DISABLED_COLOR : ICON_COLOR },
            name === shownIcon
              ? { opacity: swap, transform: [{ translateY: iconShift }] }
              : { opacity: 0 },
          ]}
        />
      ))}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: RIGHT, bottom: FLOAT_GAP, width: SIZE, height: SIZE },
  glass: { flex: 1, borderRadius: SIZE / 2 },
  icon: {
    position: 'absolute',
    width: 24,
    height: 24,
    left: (SIZE - 24) / 2,
    top: (SIZE - 24) / 2,
  },
});
