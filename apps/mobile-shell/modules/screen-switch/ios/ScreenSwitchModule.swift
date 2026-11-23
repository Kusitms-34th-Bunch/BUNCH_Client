import ExpoModulesCore
import UIKit

// 인스타 계정 전환 녹화(2026-11-23, 30fps 프레임) 기준: 붙잡은 화면이 왼쪽으로 밀려 나가는 동안 새 화면이 92% 카드로
// 오른쪽에서 들어오고(약 170ms), 이어서 원래 크기로 커짐(약 300ms). 뒤는 검정
private let slideDuration: TimeInterval = 0.17
private let growDuration: TimeInterval = 0.3
private let cardScale: CGFloat = 0.92
private let cardRadius: CGFloat = 40
// 끝 신호가 오지 않으면 덮개를 치우는 상한(JS가 멈춰도 입력이 막힌 채 남지 않게, 쉘 JS 상한과 같은 값)
private let coverCap: TimeInterval = 3

public class ScreenSwitchModule: Module {
  private var cover: UIView?
  private var capWork: DispatchWorkItem?
  // 덮기부터 움직임이 끝날 때까지(겹친 전환이 창 배경·변형을 덮어쓰지 않게 이 동안의 begin은 거절)
  private var busy = false

  public func definition() -> ModuleDefinition {
    Name("ScreenSwitch")

    // 지금 화면 전체(상태 바 포함)를 사진으로 덮음. 새 화면을 받는 동안 그 아래에서 바뀜
    AsyncFunction("begin") { () -> Bool in
      guard !self.busy, !UIAccessibility.isReduceMotionEnabled, let window = Self.keyWindow() else {
        return false
      }
      let snapshot = window.screen.snapshotView(afterScreenUpdates: false)
      snapshot.frame = window.bounds
      // 덮는 동안 VoiceOver가 아래 옛 화면을 탐색·활성화하지 않게
      snapshot.isAccessibilityElement = true
      snapshot.accessibilityLabel = "번치를 바꾸는 중"
      snapshot.accessibilityViewIsModal = true
      window.addSubview(snapshot)
      self.cover = snapshot
      self.busy = true
      let work = DispatchWorkItem { [weak self] in self?.removeCover() }
      self.capWork = work
      DispatchQueue.main.asyncAfter(deadline: .now() + coverCap, execute: work)
      return true
    }.runOnQueue(.main)

    AsyncFunction("finish") { (promise: Promise) in
      self.capWork?.cancel()
      guard let cover = self.cover, let window = Self.keyWindow(),
        let content = window.rootViewController?.view
      else {
        self.removeCover()
        promise.resolve(nil)
        return
      }
      self.cover = nil
      let width = window.bounds.width
      let background = window.backgroundColor
      window.backgroundColor = .black
      content.layer.cornerRadius = cardRadius
      content.layer.cornerCurve = .continuous
      content.layer.masksToBounds = true
      content.transform = CGAffineTransform(translationX: width, y: 0).scaledBy(x: cardScale, y: cardScale)
      UIView.animate(withDuration: slideDuration, delay: 0, options: [.curveEaseOut]) {
        cover.transform = CGAffineTransform(translationX: -width, y: 0)
        content.transform = CGAffineTransform(scaleX: cardScale, y: cardScale)
      } completion: { _ in
        cover.removeFromSuperview()
        // 커지기 시작할 때 끝을 알림: JS가 상태 바를 커지는 동안 함께 다시 보임(다 커진 뒤 따로 나타나면 깜빡여 보임, #532)
        promise.resolve(nil)
        UIView.animate(withDuration: growDuration, delay: 0, options: [.curveEaseOut]) {
          content.transform = .identity
          content.layer.cornerRadius = 0
        } completion: { _ in
          content.layer.masksToBounds = false
          window.backgroundColor = background
          self.busy = false
          // 새 번치 화면을 VoiceOver가 처음부터 읽게
          UIAccessibility.post(notification: .screenChanged, argument: nil)
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("cancel") { () in
      self.removeCover()
    }.runOnQueue(.main)
  }

  // 움직이지 않고 치움(취소·상한). 움직이는 중이면 그 마무리가 busy를 푼다
  private func removeCover() {
    capWork?.cancel()
    capWork = nil
    guard let cover else { return }
    cover.removeFromSuperview()
    self.cover = nil
    busy = false
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)
  }
}
