import { isLoaded } from 'expo-font';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isReducedMotion } from '../reduced-motion';
import type { TabId } from '../tabs/tabs';
import { type NativeToast as Toast, toastStore } from './toast-store';

// 디자인 시스템 Toast와 같은 값(RN은 CSS 변수 미지원, packages/design-system/src/components/core/toast/Toast.tsx·tokens.css)
const SURFACE = 'rgba(37, 40, 45, 0.6)'; // surface-inversed-alpha-60
const TEXT_INVERSED = '#ffffff';
const ICON_SUCCESS = '#26e26a';
const BUTTON_SURFACE = '#EAEAEA'; // Button secondary: surface-tertiary
const BUTTON_TEXT = '#121212'; // text-primary
const SIDE = 16; // 목록 폭: 화면 좌우 16px
// 아래 여백(탭 바 포함) 위 16px: 탭 막대가 있으면 웹 data-toast-anchor="tab-bar"와 같은 위치
// 플로팅 버튼(아래 여백 위 10px)과 같은 기준이라, 탭 막대를 숨긴 선택 모드에서도 버튼과 겹치는 모양이 탭 막대 화면과 같음(사용자 결정)
const BOTTOM_GAP = 16;
// Figma 공통 모션(토스트 모션): 등장 350ms·퇴장 200ms, cubic-bezier(0, 0, 0.35, 1), 5px 이동 + 투명도
const ENTER_MS = 350;
const EXIT_MS = 200;
const SHIFT = 5;
const EASING = Easing.bezier(0, 0, 0.35, 1);

const SUCCESS_ICON = require('../../assets/toast-icons/fill-circle-check.png');

function ToastView({
  toast,
  onAction,
  onDone,
}: {
  toast: Toast;
  onAction: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [reduced] = useState(isReducedMotion);
  // 탭 레이아웃이 미리 불러 둠(TOAST_FONTS). 아직이면 시스템 글꼴
  const [fontsLoaded] = useState(
    () => isLoaded('Pretendard-Regular') && isLoaded('Pretendard-SemiBold'),
  );
  const [leaving, setLeaving] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  // 다른 탭의 토스트가 바뀌어 부모가 다시 그려도 타이머·모션을 다시 시작하지 않게 최신 콜백만 참조
  const done = useRef(onDone);
  done.current = onDone;

  const leave = () => {
    setLeaving(true);
    Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_MS,
      easing: EASING,
      useNativeDriver: true,
    }).start(({ finished }) => finished && done.current());
  };
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  // 등장, 노출 시간이 지나면 퇴장 뒤 저장소에서 지움(새 토스트는 key가 바뀌어 처음부터)
  useEffect(() => {
    const enter = Animated.timing(progress, {
      toValue: 1,
      duration: ENTER_MS,
      easing: EASING,
      useNativeDriver: true,
    });
    enter.start();
    // 웹의 live region처럼 VoiceOver가 내용을 읽음
    AccessibilityInfo.announceForAccessibility(toast.message);
    if (toast.duration === null) return () => enter.stop();
    const timer = setTimeout(() => leaveRef.current(), toast.duration);
    return () => {
      enter.stop();
      clearTimeout(timer);
    };
  }, [progress, toast]);

  const translateY = reduced
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [SHIFT, 0] });
  const regular = fontsLoaded ? { fontFamily: 'Pretendard-Regular' } : null;
  const semiBold = fontsLoaded
    ? { fontFamily: 'Pretendard-SemiBold' }
    : { fontWeight: '600' as const };

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: insets.bottom + BOTTOM_GAP }]}>
      <Animated.View
        style={[
          styles.toast,
          toast.fullWidth ? styles.fullWidth : styles.contentWidth,
          { opacity: progress, transform: [{ translateY }] },
        ]}
      >
        {toast.icon === 'success' ? (
          <Image source={SUCCESS_ICON} style={styles.icon} accessibilityElementsHidden />
        ) : null}
        <View style={[styles.content, toast.fullWidth && styles.contentFill]}>
          <Text style={[toast.fullWidth ? styles.messageFill : styles.message, regular]}>
            {toast.message}
          </Text>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              // 보이는 크기(32)는 Figma 그대로 두고 누르는 범위만 위아래로 넓힘
              hitSlop={{ top: 6, bottom: 6 }}
              disabled={leaving}
              onPress={() => {
                // 액션은 바로 실행하고 웹 토스트처럼 퇴장 모션 뒤 닫음
                onAction();
                leave();
              }}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
                style={[styles.buttonLabel, semiBold]}
              >
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * 네이티브 플로팅 버튼이 떠 있는 탭의 토스트(#503, 결정 기록 030). 디자인 시스템 Toast와 같은 모양·모션·노출 시간
 * 플로팅 버튼보다 위에 그려 버튼이 토스트를 가리지 않음. 액션 버튼은 `onAction`으로 웹에 알리고 퇴장 모션 뒤 닫음
 * 웹이 다른 토스트로 바꾸거나 닫으면(hideNativeToast) 모션 없이 바로 사라지고, 웹의 아래로 밀어 닫기는 없음
 */
export function NativeToast({ tab, onAction }: { tab: TabId; onAction: (_id: string) => void }) {
  const toast = useSyncExternalStore(toastStore.subscribe, toastStore.get)[tab];
  if (!toast) return null;
  return (
    <ToastView
      key={toast.id}
      toast={toast}
      onAction={() => onAction(toast.id)}
      onDone={() => toastStore.hide(tab, toast.id)}
    />
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: SIDE, right: SIDE, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // s5
    borderRadius: 12, // r6
    backgroundColor: SURFACE,
    paddingVertical: 8, // padding-p4
    paddingRight: 8, // padding-p4
    paddingLeft: 12, // padding-p6
  },
  fullWidth: { alignSelf: 'stretch' },
  contentFill: { flexGrow: 1 },
  contentWidth: { maxWidth: '100%' },
  icon: { width: 24, height: 24, tintColor: ICON_SUCCESS },
  // 내용 줄 높이 30px(Figma 고정값), 글자와 버튼 사이 16px(s8)
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 30,
    flexShrink: 1,
  },
  // typography-body-3-regular: 14px / 21px. 목록 폭이면 남은 폭을 채우고, 내용 폭이면 글자만큼(flex: 1이면 폭이 0으로 눌림)
  message: { flexShrink: 1, color: TEXT_INVERSED, fontSize: 14, lineHeight: 21 },
  messageFill: { flex: 1, color: TEXT_INVERSED, fontSize: 14, lineHeight: 21 },
  // Button secondary sm: 높이 32px, 좌우 12px, 모서리 8px
  button: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: BUTTON_SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  // typography-label-s: 13px / 20px, 600, 자간 -0.25px
  buttonLabel: { color: BUTTON_TEXT, fontSize: 13, lineHeight: 20, letterSpacing: -0.25 },
});
