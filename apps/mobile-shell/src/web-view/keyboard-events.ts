import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

const MAX_HEIGHT = 2000;
const MAX_DURATION_MS = 1000;
const clamp = (value: number, max: number) => Math.min(max, Math.max(0, Math.round(value) || 0));

/**
 * iOS 키보드가 움직이기 직전(keyboardWillChangeFrame) 덮는 높이와 시간을 알림(#568)
 * 웹은 iOS가 늦게 주는 보이는 높이 대신 이 값으로 같은 시간에 앱 틀 높이를 맞춤. Android는 시스템이 WebView 크기를 줄여 보내지 않음
 */
export const listenKeyboardFrames = (send: (height: number, duration: number) => void) => {
  if (Platform.OS !== 'ios') return () => {};
  const subscription = Keyboard.addListener('keyboardWillChangeFrame', (event: KeyboardEvent) => {
    const screenHeight = Dimensions.get('screen').height;
    const { screenY, height } = event.endCoordinates;
    // iPad 플로팅·분할 키보드는 화면 아래를 덮지 않아 0(아래에 붙었거나 화면 밖으로 내려간 키보드만 덮는 높이 계산)
    const docked = screenY + height >= screenHeight - 1;
    const covered = docked ? screenHeight - screenY : 0;
    // bridge 계약 범위(높이 0~2000, 시간 0~1000) 밖 값이면 보내기 전 검증에서 예외가 나므로 잘라서 보냄
    send(clamp(covered, MAX_HEIGHT), clamp(event.duration, MAX_DURATION_MS));
  });
  return () => subscription.remove();
};
