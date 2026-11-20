import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';

// 웹 `apps/web/public/videos/login.mp4`와 같은 파일(앱에 넣어 네트워크 없이 바로 재생)
const LOGIN_VIDEO = require('../../assets/login-background/login.mp4');

/**
 * 로그인 화면 배경 영상(네이티브). WebView 안의 영상은 iOS 저전력 모드에서 자동 재생이 막히고,
 * 앱을 나갔다 오면 멈춘 채 남아서 쉘이 직접 재생한다(결정 기록 028)
 * 소리 없이 반복하고 다른 앱의 음악을 끊지 않음. 앱이 뒤로 가면 멈추고 돌아오면 이어서 재생
 */
export function LoginBackgroundVideo() {
  const player = useVideoPlayer(LOGIN_VIDEO, (created) => {
    created.loop = true;
    created.muted = true;
    created.audioMixingMode = 'mixWithOthers';
    created.keepScreenOnWhilePlaying = false;
    created.play();
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') player.play();
      else if (state === 'background') player.pause();
    });
    return () => subscription.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      pointerEvents="none"
      // 장식이라 보조 기술에서 숨김
      accessible={false}
    />
  );
}
