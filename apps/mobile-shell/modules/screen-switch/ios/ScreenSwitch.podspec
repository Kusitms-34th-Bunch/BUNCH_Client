Pod::Spec.new do |s|
  s.name           = 'ScreenSwitch'
  s.version        = '1.0.0'
  s.summary        = '번치 전환 때 화면 전체(상태 바·탭 바 포함)를 인스타 계정 전환처럼 움직임'
  s.license        = 'UNLICENSED'
  s.author         = 'Bunch'
  s.homepage       = 'https://github.com/Kusitms-34th-Bunch/BUNCH_Client'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
