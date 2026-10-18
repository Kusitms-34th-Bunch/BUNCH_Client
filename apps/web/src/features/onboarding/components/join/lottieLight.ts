// `lottie-react`는 엔진 세 빌드를 함께 내보내서 모듈 전체를 동적 import하면 셋 다 내려받는다
// 이 래퍼가 light 빌드만 다시 내보내 필요한 엔진 하나만 번들에 남긴다(`InviteAnimation`이 이 모듈을 동적 import한다)
export { LottieLight } from 'lottie-react';
