Pod::Spec.new do |s|
  s.name           = 'SwipeBack'
  s.version        = '1.0.0'
  s.summary        = 'WebView 스와이프 뒤로 가기를 웹 전환과 맞춤(시작 알림·이동 순간 덮개)'
  s.license        = 'UNLICENSED'
  s.author         = 'Bunch'
  s.homepage       = 'https://github.com/Kusitms-34th-Bunch/BUNCH_Client'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
  s.frameworks     = 'WebKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
