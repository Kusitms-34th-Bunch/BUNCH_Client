import { isLoaded } from 'expo-font';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

// 웹 디자인 토큰 값(packages/design-system/tokens): text-primary·text-tertiary·border-secondary·surface-primary
const COLORS = { primary: '#121212', tertiary: '#535a61', border: '#e1e2e5', surface: '#ffffff' };

/**
 * 웹을 불러오지 못했을 때 WebView 대신 그리는 화면(인터넷이 끊겨 웹으로 그릴 수 없음)
 * 웹 404(`apps/web/src/app/not-found.tsx`)와 같은 배치: 가운데 제목·설명, 아래 「다시 시도」(DS Button tertiary md 모양). Figma 없음
 */
export function WebLoadError({ onRetry }: { onRetry: () => void }) {
  // 글꼴은 탭 화면이 불러옴. 아직이면 시스템 글꼴(첫 화면에서 바로 실패한 경우)
  const fonts = isLoaded('Pretendard-Regular') && isLoaded('Pretendard-SemiBold');
  const regular = fonts ? { fontFamily: 'Pretendard-Regular' } : null;
  const semiBold = fonts ? { fontFamily: 'Pretendard-SemiBold' } : null;
  // 웹 화면이 이 화면으로 바뀐 것을 화면 읽기 사용자에게 알림
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('화면을 불러오지 못했어요');
  }, []);
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={[styles.title, semiBold]}>
        화면을 불러오지 못했어요
      </Text>
      <Text style={[styles.description, regular]}>
        네트워크 연결을 확인한 뒤 다시 시도해 주세요.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        // 보이는 높이 40은 웹 Button md와 같고, 누르는 영역만 44로
        hitSlop={{ top: 2, bottom: 2 }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={[styles.buttonLabel, semiBold]}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // PageShell 본문과 같은 좌우 16, 제목·설명 사이 8(gap-s4)
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
  },
  // typography-title-1-semi-bold
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  // typography-body-3-regular
  description: { fontSize: 14, lineHeight: 21, color: COLORS.tertiary, textAlign: 'center' },
  // Button tertiary md: 높이 40, 좌우 16, 모서리 8, 위 8(mt-s4). 큰 글자에서 잘리지 않게 최소 높이
  button: {
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  // typography-label-m
  buttonLabel: { fontSize: 15, lineHeight: 23, fontWeight: '600', color: COLORS.primary },
});
