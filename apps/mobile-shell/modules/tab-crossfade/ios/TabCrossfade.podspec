Pod::Spec.new do |s|
  s.name           = 'TabCrossfade'
  s.version        = '1.0.0'
  s.summary        = 'iOS 시스템 탭 전환 80ms 크로스페이드와 선택 햅틱(결정 기록 017)'
  s.license        = 'UNLICENSED'
  s.author         = 'Bunch'
  s.homepage       = 'https://github.com/Kusitms-34th-Bunch/BUNCH_Client'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m}'
  s.frameworks     = 'UIKit', 'WebKit'
end
