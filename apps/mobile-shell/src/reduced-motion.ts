import { AccessibilityInfo } from 'react-native';

// 동작 줄이기 설정을 미리 읽어 둠(모션마다 새로 읽으면 첫 프레임에 이동이 잠깐 보임)
let reduced = false;
void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
  reduced = value;
});
AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
  reduced = value;
});

/** 지금 동작 줄이기가 켜져 있는지(네이티브 토스트·플로팅 버튼 모션) */
export const isReducedMotion = () => reduced;
