import ExpoModulesCore

// 탭 바 꾹 누르기(modules/tab-crossfade의 BNTabLongPressHandler)를 JS 이벤트로 넘김. index는 탭 바에 보이는 순서
public class TabLongPressModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("TabLongPress")
    Events("onTabLongPress")

    // 앞선 실행이 남긴 값(강제 종료로 정리가 돌지 않음)을 지움. 탭 화면이 뜨면 쉘 JS가 다시 알려 줌
    OnCreate {
      UserDefaults.standard.removeObject(forKey: "BNTabLongPressEnabledIndex")
    }

    // 꾹 누르기를 받을 탭 순서(TabCrossfade.m이 읽음). 음수면 꺼짐
    Function("setEnabledIndex") { (index: Int) in
      if index < 0 {
        UserDefaults.standard.removeObject(forKey: "BNTabLongPressEnabledIndex")
      } else {
        UserDefaults.standard.set(index, forKey: "BNTabLongPressEnabledIndex")
      }
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: Notification.Name("BNTabLongPress"), object: nil, queue: .main
      ) { [weak self] notification in
        guard let index = notification.userInfo?["index"] as? Int else { return }
        self?.sendEvent("onTabLongPress", ["index": index])
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
    }
  }
}
