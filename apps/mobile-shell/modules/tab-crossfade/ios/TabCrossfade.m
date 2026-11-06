#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

// 탭 전환 시간(웹 AppTransitions의 TAB_CROSSFADE_DURATION_MS와 같은 값)
static const NSTimeInterval kTabCrossfadeDuration = 0.08;
// 들어오는 탭 WebView가 다시 그려지기를 기다리는 최대 시간. 다시 붙은 WebView는 약 60ms 빈 화면이라 그린 뒤 페이드
static const NSTimeInterval kWebViewPaintTimeout = 0.15;

static WKWebView *BNFindWebView(UIView *view)
{
  if ([view isKindOfClass:[WKWebView class]]) {
    return (WKWebView *)view;
  }
  for (UIView *subview in view.subviews) {
    WKWebView *webView = BNFindWebView(subview);
    if (webView) {
      return webView;
    }
  }
  return nil;
}

/** 들어오는 화면을 아래에 불투명하게 두고 위의 나가는 화면만 1→0으로 등속 페이드(같은 헤더가 흐려지지 않음) */
@interface BNTabCrossfadeAnimator : NSObject <UIViewControllerAnimatedTransitioning>
@end

@implementation BNTabCrossfadeAnimator

- (NSTimeInterval)transitionDuration:(id<UIViewControllerContextTransitioning>)context
{
  return kTabCrossfadeDuration;
}

- (void)animateTransition:(id<UIViewControllerContextTransitioning>)context
{
  UIViewController *fromController = [context viewControllerForKey:UITransitionContextFromViewControllerKey];
  UIViewController *toController = [context viewControllerForKey:UITransitionContextToViewControllerKey];
  UIView *fromView = [context viewForKey:UITransitionContextFromViewKey] ?: fromController.view;
  UIView *toView = [context viewForKey:UITransitionContextToViewKey] ?: toController.view;

  toView.frame = [context finalFrameForViewController:toController];
  if (fromView.superview == context.containerView) {
    [context.containerView insertSubview:toView belowSubview:fromView];
  } else {
    [context.containerView addSubview:toView];
  }

  __block BOOL started = NO;
  void (^fade)(void) = ^{
    if (started) {
      return;
    }
    started = YES;
    [UIView animateWithDuration:kTabCrossfadeDuration
        delay:0
        options:UIViewAnimationOptionCurveLinear
        animations:^{
          fromView.alpha = 0;
        }
        completion:^(__unused BOOL finished) {
          BOOL cancelled = context.transitionWasCancelled;
          fromView.alpha = 1;
          if (cancelled) {
            [toView removeFromSuperview];
          }
          [context completeTransition:!cancelled];
        }];
  };

  WKWebView *webView = BNFindWebView(toView);
  if (!webView) {
    fade();
    return;
  }
  // 웹 페이지가 다시 보이게 된 뒤 프레임 두 번을 그리면 시작(다시 붙은 WebView의 빈 화면 방지), 응답이 없으면 시간 초과로 시작
  [webView callAsyncJavaScript:@"await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"
                     arguments:nil
                       inFrame:nil
              inContentWorld:WKContentWorld.defaultClientWorld
             completionHandler:^(__unused id result, __unused NSError *error) {
               fade();
             }];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kWebViewPaintTimeout * NSEC_PER_SEC)),
      dispatch_get_main_queue(), fade);
}

@end

// 동작 줄이기 설정이면 nil(시스템 기본 즉시 전환)
static id<UIViewControllerAnimatedTransitioning> BNTabAnimationController(
    __unused id delegate, __unused SEL selector, __unused UITabBarController *controller,
    __unused UIViewController *from, __unused UIViewController *to)
{
  if (UIAccessibilityIsReduceMotionEnabled()) {
    return nil;
  }
  return [BNTabCrossfadeAnimator new];
}

/**
 * react-native-screens의 탭 컨트롤러(RNSTabBarController, 자기 자신이 delegate)에 탭 전환 애니메이션과 탭 햅틱을 연결
 * 애니메이션: 전환 애니메이션 delegate 메서드를 추가. 라이브러리가 직접 구현하게 되면 추가하지 않고 그쪽 동작을 따름
 * 햅틱: 사용자가 탭을 누를 때만 불리는 shouldSelect를 감싸 원래 처리 뒤 선택 햅틱(같은 탭 재선택 포함, 코드 전환 제외)
 */
@interface BNTabCrossfadeInstaller : NSObject
@end

@implementation BNTabCrossfadeInstaller

+ (void)load
{
  Class tabBarController = NSClassFromString(@"RNSTabBarController");
  if (!tabBarController) {
    return;
  }
  SEL animationSelector = @selector(tabBarController:animationControllerForTransitionFromViewController:toViewController:);
  class_addMethod(tabBarController, animationSelector, (IMP)BNTabAnimationController, "@@:@@@");

  SEL shouldSelectSelector = @selector(tabBarController:shouldSelectViewController:);
  Method shouldSelect = class_getInstanceMethod(tabBarController, shouldSelectSelector);
  // 상속받은 구현이면 상위 클래스 전체가 바뀌므로 감싸지 않음(직접 구현할 때만)
  Method inherited = class_getInstanceMethod(class_getSuperclass(tabBarController), shouldSelectSelector);
  if (!shouldSelect || (inherited && method_getImplementation(inherited) == method_getImplementation(shouldSelect))) {
    return;
  }
  BOOL (*original)(id, SEL, UITabBarController *, UIViewController *) =
      (BOOL (*)(id, SEL, UITabBarController *, UIViewController *))method_getImplementation(shouldSelect);
  method_setImplementation(
      shouldSelect, imp_implementationWithBlock(^BOOL(id controller, UITabBarController *tabBar, UIViewController *target) {
        BOOL allowed = original(controller, shouldSelectSelector, tabBar, target);
        // 이동하는 탭과 지금 탭 재선택만(라이브러리가 막은 선택 제외). 햅틱 객체는 처음 누를 때 생성
        if (allowed || tabBar.selectedViewController == target) {
          static UISelectionFeedbackGenerator *feedback;
          if (!feedback) {
            feedback = [UISelectionFeedbackGenerator new];
          }
          [feedback selectionChanged];
        }
        return allowed;
      }));
}

@end
