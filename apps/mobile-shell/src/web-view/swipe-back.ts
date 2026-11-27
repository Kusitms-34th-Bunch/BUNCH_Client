import { requireOptionalNativeModule } from 'expo';

type SwipeBackModule = {
  attach: () => void;
  settle: () => void;
};

// 쉘의 네이티브 모듈(modules/swipe-back의 SwipeBackModule, iOS만). Expo Go·안드로이드·이전 개발 앱에는 없음
const SwipeBack = requireOptionalNativeModule<SwipeBackModule>('SwipeBack');

/** 화면의 WebView에 스와이프 뒤로 가기 신호·덮개를 붙임(문서를 불러올 때마다, 붙은 WebView는 건너뜀) */
export const attachSwipeBack = () => SwipeBack?.attach();

/** 웹이 스와이프로 돌아간 화면을 그렸다고 알림. 이동 순간 덮은 화면을 걷음 */
export const settleSwipeBack = () => SwipeBack?.settle();
