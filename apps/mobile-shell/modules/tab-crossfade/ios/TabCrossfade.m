#import <QuartzCore/QuartzCore.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

// 탭 전환 시간(웹 app/(app)/_transitions/tabCrossfade.ts의 TAB_CROSSFADE_DURATION_MS와 같은 값)
static const NSTimeInterval kTabCrossfadeDuration = 0.08;
// 들어오는 탭 WebView가 다시 그려지기를 기다리는 최대 시간. 다시 붙은 WebView는 약 60ms 빈 화면이라 그린 뒤 페이드
static const NSTimeInterval kWebViewPaintTimeout = 0.15;

// 탭 전환 애니메이션이 끝나는 시각(그동안 다른 탭 선택은 무시, 아래 shouldSelect). 끝 알림이 빠져도 풀리게 상한을 둔 시각으로 저장
// 전환 중 다른 탭을 누르면 탭 바 선택 표시만 바뀌고 화면은 진행 중인 탭으로 끝나 어긋남(팀 QA, 번치 탭 두 번 누르기 직후 사진함)
static CFTimeInterval BNTabTransitionUntil = 0;
// 꾹 누르기가 인식된 뒤 손을 뗄 때까지(그동안 다른 탭 선택은 무시, 아래 shouldSelect). 같은 이유로 상한 시각
// iOS 26 탭 바는 누른 채 끌어 탭을 고를 수 있어, 전환 시트가 열린 채 다른 탭으로 넘어갔음(#583 시뮬레이터)
static CFTimeInterval BNTabLongPressUntil = 0;
// 상한: 전환은 페이드 대기 150ms + 80ms보다 넉넉히, 꾹 누르기는 시트를 연 채 끄는 시간
static const CFTimeInterval kTabTransitionGuard = 0.5;
static const CFTimeInterval kTabLongPressGuard = 3;

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

  BNTabTransitionUntil = CACurrentMediaTime() + kTabTransitionGuard;
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
          BNTabTransitionUntil = 0;
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

// 탭 꾹 누르기를 JS(TabLongPressModule)에 알리는 알림 이름. userInfo의 index는 탭 바에 보이는 순서
NSString *const BNTabLongPressNotification = @"BNTabLongPress";
// 꾹 누르기를 받을 탭 순서(쉘 JS가 TabLongPressModule로 저장, 없으면 꺼짐). 그 밖의 탭은 평소처럼 다시 누름으로
static NSString *const BNTabLongPressIndexKey = @"BNTabLongPressEnabledIndex";

/** 탭 바의 항목 버튼들. iOS 버전마다 내부 클래스 이름이 달라 이름에 Tab·Button이 든 UIControl을 모음(iOS 26은 `_UITabButton`) */
static void BNCollectTabButtons(UIView *view, NSMutableArray<UIView *> *buttons)
{
  for (UIView *subview in view.subviews) {
    NSString *name = NSStringFromClass([subview class]);
    if ([subview isKindOfClass:[UIControl class]] && [name containsString:@"Tab"] && [name containsString:@"Button"]) {
      [buttons addObject:subview];
    } else {
      BNCollectTabButtons(subview, buttons);
    }
  }
}

/**
 * 누른 위치의 탭 순서. iOS 26은 선택 렌즈용으로 같은 버튼을 두 겹 그려 같은 자리의 버튼을 하나로 셈
 * 버튼 자리 수가 항목 수와 다르면(내부 구조 변경) 찾지 않음
 */
static NSInteger BNTabIndexAtPoint(UITabBar *tabBar, CGPoint point)
{
  NSMutableArray<UIView *> *buttons = [NSMutableArray array];
  BNCollectTabButtons(tabBar, buttons);
  NSMutableArray<NSValue *> *frames = [NSMutableArray array];
  for (UIView *button in buttons) {
    CGRect frame = [button convertRect:button.bounds toView:tabBar];
    BOOL seen = NO;
    for (NSValue *value in frames) {
      if (fabs(CGRectGetMidX(value.CGRectValue) - CGRectGetMidX(frame)) < 1) {
        seen = YES;
        break;
      }
    }
    if (!seen) {
      [frames addObject:[NSValue valueWithCGRect:frame]];
    }
  }
  if (frames.count == 0 || frames.count != tabBar.items.count) {
    return NSNotFound;
  }
  [frames sortUsingComparator:^NSComparisonResult(NSValue *a, NSValue *b) {
    CGFloat ax = CGRectGetMinX(a.CGRectValue);
    CGFloat bx = CGRectGetMinX(b.CGRectValue);
    return ax < bx ? NSOrderedAscending : (ax > bx ? NSOrderedDescending : NSOrderedSame);
  }];
  // 이웃 버튼 영역이 조금 겹쳐서 누른 곳을 품은 버튼 중 가운데가 가장 가까운 것
  NSInteger found = NSNotFound;
  CGFloat nearest = CGFLOAT_MAX;
  for (NSUInteger index = 0; index < frames.count; index++) {
    CGRect frame = frames[index].CGRectValue;
    CGFloat distance = fabs(CGRectGetMidX(frame) - point.x);
    if (CGRectContainsPoint(frame, point) && distance < nearest) {
      nearest = distance;
      found = (NSInteger)index;
    }
  }
  return found;
}

/** 꾹 누르기를 받는 탭을 보고 있을 때 그 탭을 꾹 누르면(0.5초) 햅틱 뒤 JS에 알림. 그 밖에는 시작하지 않아 평소처럼 탭 이동·다시 누름 */
@interface BNTabLongPressHandler : NSObject <UIGestureRecognizerDelegate>
@end

@implementation BNTabLongPressHandler

- (BOOL)gestureRecognizerShouldBegin:(UIGestureRecognizer *)recognizer
{
  UITabBar *tabBar = (UITabBar *)recognizer.view;
  NSNumber *enabled = [[NSUserDefaults standardUserDefaults] objectForKey:BNTabLongPressIndexKey];
  NSInteger index = BNTabIndexAtPoint(tabBar, [recognizer locationInView:tabBar]);
  return enabled != nil && index == enabled.integerValue && tabBar.selectedItem != nil &&
      (NSUInteger)index == [tabBar.items indexOfObject:tabBar.selectedItem];
}

// 탭 바 자체의 누름·끌기(iOS 26 선택 렌즈) 인식을 막지 않음
- (BOOL)gestureRecognizer:(__unused UIGestureRecognizer *)recognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(__unused UIGestureRecognizer *)other
{
  return YES;
}

- (void)handleLongPress:(UILongPressGestureRecognizer *)recognizer
{
  UIGestureRecognizerState state = recognizer.state;
  if (state == UIGestureRecognizerStateEnded || state == UIGestureRecognizerStateCancelled ||
      state == UIGestureRecognizerStateFailed) {
    // 손을 떼는 순간 들어오는 끌기 선택까지 막도록 다음 실행 순서에 풂
    dispatch_async(dispatch_get_main_queue(), ^{
      BNTabLongPressUntil = 0;
    });
    return;
  }
  if (state != UIGestureRecognizerStateBegan) {
    return;
  }
  UITabBar *tabBar = (UITabBar *)recognizer.view;
  NSInteger index = BNTabIndexAtPoint(tabBar, [recognizer locationInView:tabBar]);
  if (index == NSNotFound) {
    return;
  }
  BNTabLongPressUntil = CACurrentMediaTime() + kTabLongPressGuard;
  [[UIImpactFeedbackGenerator new] impactOccurred];
  [[NSNotificationCenter defaultCenter] postNotificationName:BNTabLongPressNotification
                                                      object:nil
                                                    userInfo:@{@"index" : @(index)}];
}

@end

/**
 * iOS 26 UIKit 버그(FB24250687): 탭 바가 화면에 붙은 뒤 첫 레이아웃 전에 항목의 제목·이미지(비동기 PNG 아이콘)가 바뀌면
 * 선택하지 않은 탭 라벨을 찌그러뜨려 아래로 밀어 그림(누르면 그 탭만 정상, #575·#462). react-native-screens PR #5242와 같은 우회
 */
static const void *kBNTitleRefitPendingKey = &kBNTitleRefitPendingKey;

// 탭을 설치한 뒤 다음 레이아웃에서 한 번 라벨을 다시 맞추도록 표시(iOS 27은 버그가 없어 하지 않음)
static void BNMarkTitleRefit(UITabBarController *controller)
{
  if (@available(iOS 27.0, *)) {
    return;
  }
  if (@available(iOS 26.0, *)) {
    objc_setAssociatedObject(controller, kBNTitleRefitPendingKey, @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    [controller.view setNeedsLayout];
  }
}

// 화면에 붙은 뒤 탭 바를 먼저 레이아웃하고, 같은 제목을 nil을 거쳐 다시 넣어 UIKit이 라벨 크기를 다시 맞추게 함(같은 값 대입은 무시됨)
static void BNRefitTabTitlesIfNeeded(UITabBarController *controller)
{
  if (!objc_getAssociatedObject(controller, kBNTitleRefitPendingKey) || !controller.view.window) {
    return;
  }
  // VoiceOver 초점이 탭 바 안이면 다음 레이아웃으로 미룸(제목을 다시 넣으면 초점이 풀리거나 다시 읽힘, 낭독은 접근성 라벨이라 잘림과 무관)
  if (UIAccessibilityIsVoiceOverRunning()) {
    id focused = UIAccessibilityFocusedElement(UIAccessibilityNotificationVoiceOverIdentifier);
    if ([focused isKindOfClass:[UIView class]] && [(UIView *)focused isDescendantOfView:controller.tabBar]) {
      return;
    }
  }
  objc_setAssociatedObject(controller, kBNTitleRefitPendingKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  [controller.tabBar layoutIfNeeded];
  for (UITabBarItem *item in controller.tabBar.items) {
    NSString *title = item.title;
    if (title.length == 0) {
      continue;
    }
    item.title = nil;
    item.title = title;
  }
}

// 탭 설치(UIKit 공개 API: 이전 방식 setViewControllers, iOS 26.1+ setTabs) 뒤에 표시를 남기게 감쌈. 상속 구현이면 이 클래스에만 덮어씀
static void BNWrapTabInstall(Class tabBarController, SEL selector)
{
  Method method = class_getInstanceMethod(tabBarController, selector);
  if (!method) {
    return;
  }
  void (*original)(id, SEL, id, BOOL) = (void (*)(id, SEL, id, BOOL))method_getImplementation(method);
  IMP wrapped = imp_implementationWithBlock(^(UITabBarController *controller, id value, BOOL animated) {
    original(controller, selector, value, animated);
    BNMarkTitleRefit(controller);
  });
  if (!class_addMethod(tabBarController, selector, wrapped, method_getTypeEncoding(method))) {
    method_setImplementation(method, wrapped);
  }
}

static void BNWrapLayoutForTitleRefit(Class tabBarController)
{
  SEL selector = @selector(viewDidLayoutSubviews);
  Method method = class_getInstanceMethod(tabBarController, selector);
  if (!method) {
    return;
  }
  void (*original)(id, SEL) = (void (*)(id, SEL))method_getImplementation(method);
  IMP wrapped = imp_implementationWithBlock(^(UITabBarController *controller) {
    original(controller, selector);
    BNRefitTabTitlesIfNeeded(controller);
  });
  if (!class_addMethod(tabBarController, selector, wrapped, method_getTypeEncoding(method))) {
    method_setImplementation(method, wrapped);
  }
}

// 탭 바가 다시 나타날 때는 iOS 애니메이션 없이 바로(#583). iOS 26의 나타나는 애니메이션은 아이콘 없는 유리 막대가 먼저 보여 어색함(시뮬레이터 녹화)
// 숨길 때는 iOS 기본 애니메이션 그대로. 웹이 시트·화면이 비켜난 순간에 맞춰 보내므로 바로 나타나도 튀지 않음
static void BNWrapTabBarHidden(Class tabBarController)
{
  SEL selector = NSSelectorFromString(@"setTabBarHidden:animated:");
  Method method = class_getInstanceMethod(tabBarController, selector);
  if (!method) {
    return;
  }
  void (*original)(id, SEL, BOOL, BOOL) = (void (*)(id, SEL, BOOL, BOOL))method_getImplementation(method);
  IMP wrapped = imp_implementationWithBlock(^(UITabBarController *controller, BOOL hidden, BOOL animated) {
    original(controller, selector, hidden, hidden && animated);
  });
  if (!class_addMethod(tabBarController, selector, wrapped, method_getTypeEncoding(method))) {
    method_setImplementation(method, wrapped);
  }
}

static const void *kBNTabLongPressHandlerKey = &kBNTabLongPressHandlerKey;

static void BNInstallTabLongPress(UITabBarController *controller)
{
  UITabBar *tabBar = controller.tabBar;
  if (!tabBar || objc_getAssociatedObject(tabBar, kBNTabLongPressHandlerKey)) {
    return;
  }
  BNTabLongPressHandler *handler = [BNTabLongPressHandler new];
  UILongPressGestureRecognizer *recognizer =
      [[UILongPressGestureRecognizer alloc] initWithTarget:handler action:@selector(handleLongPress:)];
  recognizer.minimumPressDuration = 0.5;
  recognizer.delegate = handler;
  // 인식되면 손을 뗄 때의 탭 선택(다시 누름·맨 위로)을 보내지 않음
  recognizer.cancelsTouchesInView = YES;
  [tabBar addGestureRecognizer:recognizer];
  objc_setAssociatedObject(tabBar, kBNTabLongPressHandlerKey, handler, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
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

  // iOS 26 탭 라벨 잘림 우회(위 BNRefitTabTitlesIfNeeded)
  BNWrapTabInstall(tabBarController, @selector(setViewControllers:animated:));
  BNWrapTabInstall(tabBarController, NSSelectorFromString(@"setTabs:animated:"));
  BNWrapLayoutForTitleRefit(tabBarController);

  // 탭 바가 다시 나타날 때 iOS 애니메이션 끔(위 BNWrapTabBarHidden)
  BNWrapTabBarHidden(tabBarController);

  // 꾹 누르기: 탭 컨트롤러가 화면에 붙을 때 탭 바에 제스처를 한 번 붙임(라이브러리가 직접 구현한 메서드를 감쌈)
  SEL attachSelector = @selector(didMoveToParentViewController:);
  Method attach = class_getInstanceMethod(tabBarController, attachSelector);
  Method attachInherited = class_getInstanceMethod(class_getSuperclass(tabBarController), attachSelector);
  if (attach && !(attachInherited && method_getImplementation(attachInherited) == method_getImplementation(attach))) {
    void (*originalAttach)(id, SEL, UIViewController *) =
        (void (*)(id, SEL, UIViewController *))method_getImplementation(attach);
    method_setImplementation(attach, imp_implementationWithBlock(^(UITabBarController *controller, UIViewController *parent) {
      originalAttach(controller, attachSelector, parent);
      if (parent) {
        BNInstallTabLongPress(controller);
      }
    }));
  }

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
        // 전환 중·꾹 누르는 중 다른 탭 선택은 무시(탭 바 표시와 화면이 어긋나지 않게). 지금 탭 다시 누름은 그대로
        // VoiceOver·스위치 제어는 막지 않음(빠른 연타·누른 채 끌기가 없고, 무시되면 알 수 없음)
        CFTimeInterval now = CACurrentMediaTime();
        BOOL assistive = UIAccessibilityIsVoiceOverRunning() || UIAccessibilityIsSwitchControlRunning();
        if (!assistive && (now < BNTabTransitionUntil || now < BNTabLongPressUntil) &&
            tabBar.selectedViewController != target) {
          return NO;
        }
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
