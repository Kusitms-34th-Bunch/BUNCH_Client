'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LOGIN_BACKGROUND_POSTER, LOGIN_BACKGROUND_VIDEO } from '../../constants/loginBackground';

type WebBackgroundVideoProps = {
  /** 소셜 로그인 진행 중(다른 앱에 다녀오는 동안 영상을 멈춰 둠) */
  loggingIn: boolean;
};

/**
 * 로그인 배경 영상(웹). iOS 쉘은 네이티브 영상을 쓰고(`useNativeLoginBackground`), 브라우저·안드로이드·이전 쉘에서 씀
 * 소리 없이 반복 재생하고, 재생 중이 아닐 때는 첫 프레임으로 덮어 iOS 재생 버튼을 가림
 */
export function WebBackgroundVideo({ loggingIn }: WebBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // 영상이 빠졌다 다시 생기면 재생 전 상태부터 시작(첫 프레임 덮개가 다시 보임)
  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (!video) setPlaying(false);
  }, []);

  // 로그아웃 뒤처럼 화면 안에서 이동해 오면 React가 `muted`를 속성(attribute) 없이 값으로만 넣어
  // iOS가 소리 있는 영상으로 보고 자동 재생을 막음(재생 버튼만 보임). 소리 없음을 확실히 한 뒤 직접 재생
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute('muted', '');
    void video.play()?.catch(() => {});
  }, []);

  // 카카오톡 등 다른 앱으로 갔다 오는 로그인 중에는 영상을 멈춰 둠(돌아올 때 iOS가 다시 재생해 처음부터 나오는 것처럼 보임)
  useEffect(() => {
    const video = videoRef.current;
    if (!loggingIn || !video) return;
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden') video.pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      // 취소·실패로 로그인 화면에 남으면 다시 재생
      if (video.isConnected) void video.play()?.catch(() => {});
    };
  }, [loggingIn]);

  // 앱을 잠깐 나갔다 오면 iOS가 멈춘 영상을 다시 틀지 않을 때가 있어, 화면에 돌아오면 다시 재생(로그인 중에는 위 effect가 맡음)
  useEffect(() => {
    if (loggingIn) return;
    const resumeWhenVisible = () => {
      const video = videoRef.current;
      if (document.visibilityState === 'visible' && video?.paused) {
        void video.play()?.catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', resumeWhenVisible);
    return () => document.removeEventListener('visibilitychange', resumeWhenVisible);
  }, [loggingIn]);

  return (
    <>
      {/* iOS 자동 재생 조건: muted·playsInline */}
      <video
        ref={attachVideo}
        src={LOGIN_BACKGROUND_VIDEO}
        poster={LOGIN_BACKGROUND_POSTER}
        autoPlay
        muted
        loop
        playsInline
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-cover"
      />
      {/* 저전력 모드 등으로 재생이 막히거나 멈추면 iOS가 영상 위에 재생 버튼을 그리므로, 재생 중이 아닐 때는 첫 프레임으로 덮음
          영상 자체를 숨기면(투명도 0 등) iOS가 안 보이는 영상으로 보고 자동 재생을 하지 않을 수 있어 덮개를 따로 둠 */}
      {playing ? null : (
        <div
          data-testid="login-video-cover"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${LOGIN_BACKGROUND_POSTER})` }}
        />
      )}
    </>
  );
}
