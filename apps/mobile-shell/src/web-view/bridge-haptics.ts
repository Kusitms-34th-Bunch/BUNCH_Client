import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { hapticKindSchema, type AppBridgeMethods } from '@app/bridge';

/** 탭 선택·끌기 시작·화면 사건 햅틱 bridge 처리 */
export const hapticBridge = {
  // 안드로이드 시스템 햅틱(기기 햅틱 설정을 따름). iOS는 시스템 탭 바가 아니면 쓰이지 않아 선택 햅틱으로 대체
  tabSelectionHaptic: () =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync(),
  // 사진을 길게 눌러 집어 올린 순간(끌기 시작): 안드로이드는 모든 버전에서 지원하는 길게 누르기 시스템 햅틱(기기의 터치 피드백 설정을 따름), 쓸 수 없으면 진동 모터 충격
  // iOS는 중간 세기 충격. 끌기 시작 전용 햅틱(`Drag_Start`)은 안드로이드 14 이상만 지원하고 기기에 따라 아주 약해서 쓰지 않음
  dragStartHaptic: async () => {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press).catch(() =>
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        );
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      // 햅틱은 보조 효과라 웹에 오류를 올리지 않고 개발 중에만 알림
      if (__DEV__) console.warn('[haptic] 끌기 시작 햅틱을 울리지 못했어요', error);
    }
  },
  // 화면 사건의 햅틱: 완료 축하는 성공 알림, 그 밖은 가벼운 충격. 웹 입력은 스키마로 다시 확인
  feedbackHaptic: async (kind) => {
    try {
      if (hapticKindSchema.parse(kind) === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      if (__DEV__) console.warn('[haptic] 햅틱을 울리지 못했어요', error);
    }
  },
} satisfies Partial<AppBridgeMethods>;
