import ExpoModulesCore
import UIKit
import WebKit

// WebView 스와이프 뒤로 가기(allowsBackForwardNavigationGestures)를 웹 화면 전환과 맞춤(#587)
// 손가락을 따라 앞 화면 스냅샷이 밀리는 기본 동작은 그대로 두고, 같은 가장자리 제스처를 함께 받아
// 시작·취소를 웹에 알려(SSGOI 전환 건너뛰기) 이동 순간 화면을 덮었다가 웹이 그린 뒤 걷음(흰 화면 방지)
public class SwipeBackModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SwipeBack")

    // 화면의 모든 WKWebView에 붙임(이미 붙은 것은 건너뜀). WebView가 문서를 불러올 때마다 쉘 JS가 부름
    Function("attach") {
      DispatchQueue.main.async { SwipeBackCoordinator.shared.attachAll() }
    }

    // 웹이 새 화면을 그렸다고 알림(bridge swipeBackSettled). 덮개를 걷음
    Function("settle") {
      DispatchQueue.main.async { SwipeBackCoordinator.shared.settle() }
    }
  }
}

final class SwipeBackCoordinator {
  static let shared = SwipeBackCoordinator()
  private var watchers: [ObjectIdentifier: SwipeBackWatcher] = [:]

  func attachAll() {
    watchers = watchers.filter { $0.value.webView != nil }
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    for window in windows { attach(in: window) }
  }

  private func attach(in view: UIView) {
    if let webView = view as? WKWebView {
      let id = ObjectIdentifier(webView)
      if watchers[id] == nil { watchers[id] = SwipeBackWatcher(webView: webView) }
      return
    }
    for subview in view.subviews { attach(in: subview) }
  }

  func settle() {
    for watcher in watchers.values { watcher.removeCover() }
  }
}

final class SwipeBackWatcher: NSObject, UIGestureRecognizerDelegate {
  // 웹(SSGOI 패치)이 받는 이벤트. detail true면 스와이프 중, false면 이동 없이 끝남
  private static let eventName = "ssgoi:swipe-back"
  // 손을 뗀 뒤 이 시간 안에 주소가 바뀌지 않으면 취소로 봄(WebKit이 남은 거리를 밀고 이동하는 시간보다 길게)
  private static let settleWindow: TimeInterval = 1.0
  // 웹 신호가 오지 않아도 덮개를 걷는 시간
  private static let coverLimit: TimeInterval = 1.0

  weak var webView: WKWebView?
  private var urlObservation: NSKeyValueObservation?
  private var swiping = false
  // 손을 뗀 뒤에만 주소 변경을 스와이프 이동으로 봄(끄는 동안·취소 뒤 다른 이동과 구분)
  private var released = false
  private var cancelCheck: DispatchWorkItem?
  private var coverLimit: DispatchWorkItem?
  private var cover: UIView?

  init(webView: WKWebView) {
    self.webView = webView
    super.init()
    let pan = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
    pan.edges = .left
    pan.cancelsTouchesInView = false
    pan.delaysTouchesBegan = false
    pan.delaysTouchesEnded = false
    pan.delegate = self
    webView.addGestureRecognizer(pan)
    urlObservation = webView.observe(\.url, options: [.new]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.urlChanged() }
    }
  }

  // WebView 기본 스와이프와 함께 인식(기본 동작을 막지 않음)
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    true
  }

  @objc private func handlePan(_ pan: UIScreenEdgePanGestureRecognizer) {
    guard let webView else { return }
    switch pan.state {
    case .began:
      // 기본 스와이프가 꺼진 화면(로그인 등)이나 돌아갈 곳이 없으면 아무것도 하지 않음
      guard webView.allowsBackForwardNavigationGestures, webView.canGoBack else { return }
      cancelCheck?.cancel()
      swiping = true
      released = false
      notify(webView, swiping: true)
    case .ended, .cancelled, .failed:
      guard swiping else { return }
      released = true
      let check = DispatchWorkItem { [weak self] in
        guard let self, self.swiping, let webView = self.webView else { return }
        self.swiping = false
        self.released = false
        self.notify(webView, swiping: false)
      }
      cancelCheck = check
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.settleWindow, execute: check)
    default:
      break
    }
  }

  // 스와이프로 이동한 순간 화면(WebKit이 깐 앞 화면 스냅샷)을 덮개로 덮음
  private func urlChanged() {
    guard swiping, released, let webView, let container = webView.superview else { return }
    swiping = false
    released = false
    cancelCheck?.cancel()
    guard cover == nil, let snapshot = container.snapshotView(afterScreenUpdates: false) else { return }
    snapshot.frame = container.bounds
    // 덮는 동안에도 누름은 아래 WebView로(덮개는 그림만)
    snapshot.isUserInteractionEnabled = false
    container.addSubview(snapshot)
    cover = snapshot
    let limit = DispatchWorkItem { [weak self] in self?.removeCover() }
    coverLimit = limit
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.coverLimit, execute: limit)
  }

  func removeCover() {
    coverLimit?.cancel()
    coverLimit = nil
    cover?.removeFromSuperview()
    cover = nil
  }

  private func notify(_ webView: WKWebView, swiping: Bool) {
    webView.evaluateJavaScript(
      "window.dispatchEvent(new CustomEvent('\(Self.eventName)',{detail:\(swiping)}));void 0;",
      completionHandler: nil
    )
  }
}
