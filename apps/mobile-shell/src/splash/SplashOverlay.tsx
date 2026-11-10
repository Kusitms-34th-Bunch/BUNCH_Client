import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { SPLASH_MODULES } from './modules';
import { hideNativeSplash, onWebReady } from './state';

// 디자이너 Lottie(Splash) 기준: 60fps, 240f(4초) 반복, 모듈이 다 모이는 131.7f
const FPS = 60;
const LOOP_FRAMES = 240;
const ASSEMBLED_FRAME = 132;
const MODULE = 8;
const WORDMARK = { width: 192, height: 48 };
// bunch-500. app.json의 네이티브 스플래시 배경과 같아야 이어질 때 티가 안 남
const BRAND = '#454EDF';
const FADE_MS = 300;
const MOVE = Easing.bezier(0.33, 0, 0.15, 1);
const APPEAR = Easing.bezier(0.35, 0, 0.35, 1);
// 네이티브 드라이버는 선형 보간만 하므로 곡선을 점 여러 개로 나눠 넘김
const SAMPLES = 12;

const frameMs = (frames: number) => (frames / FPS) * 1000;

function eased(
  clock: Animated.Value,
  from: number,
  to: number,
  start: number,
  end: number,
  easing: (t: number) => number,
) {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let step = 0; step <= SAMPLES; step += 1) {
    const t = step / SAMPLES;
    inputRange.push(start + (end - start) * t);
    outputRange.push(from + (to - from) * easing(t));
  }
  return clock.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
}

/**
 * 앱을 켤 때 웹이 뜰 때까지 덮는 스플래시. 모듈 48개가 날아와 bunch 워드마크가 되는 4초 연출을 반복
 * 웹이 준비되면 그 회차의 조립이 끝난 뒤 페이드로 사라짐. 동작 줄이기면 완성된 워드마크만 보임
 */
export function SplashOverlay() {
  const [done, setDone] = useState(false);
  const [still, setStill] = useState<boolean | null>(null);
  const clock = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      // 500ms 대기로 이미 정했으면 늦게 온 결과로 바꾸지 않음(진행 중인 연출이 끊기지 않게)
      .then((value) => setStill((current) => current ?? value))
      .catch(() => setStill(false));
    // 설정 조회가 끝나지 않아도 스플래시에 갇히지 않게 잠시 뒤에는 움직임을 켠 것으로 진행
    const timer = setTimeout(() => setStill((current) => current ?? false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (still === null) return;
    let loop: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    if (still) {
      clock.setValue(LOOP_FRAMES);
    } else {
      loop = Animated.loop(
        Animated.timing(clock, {
          toValue: LOOP_FRAMES,
          duration: frameMs(LOOP_FRAMES),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    }
    const unsubscribe = onWebReady(() => {
      // 조립 도중이면 다 모일 때까지 기다린 뒤 반복을 멈추고 사라짐
      const inCycle = still
        ? frameMs(LOOP_FRAMES)
        : (Date.now() - startedAt) % frameMs(LOOP_FRAMES);
      const wait = Math.max(frameMs(ASSEMBLED_FRAME) - inCycle, 0);
      timer = setTimeout(() => {
        loop?.stop();
        Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() =>
          setDone(true),
        );
      }, wait);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
      loop?.stop();
    };
  }, [still, clock, fade]);

  const modules = useMemo(
    () =>
      SPLASH_MODULES.map(([fromX, fromY, toX, toY, start, end, shown]) => ({
        translateX: eased(clock, fromX, toX, start, end, MOVE),
        translateY: eased(clock, fromY, toY, start, end, MOVE),
        opacity: eased(clock, 0, 1, start, shown, APPEAR),
      })),
    [clock],
  );

  if (done) return null;
  return (
    <Animated.View
      style={[styles.root, { opacity: fade }]}
      // 같은 색 화면이 덮은 뒤에 네이티브 스플래시를 닫아 깜빡이지 않게
      onLayout={hideNativeSplash}
      // 장식 화면이라 보조 기술에서 숨김(그 아래 웹 화면이 곧 읽힘)
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.wordmark}>
        {modules.map(({ translateX, translateY, opacity }, index) => (
          <Animated.View
            key={index}
            style={[styles.module, { opacity, transform: [{ translateX }, { translateY }] }]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  wordmark: {
    width: WORDMARK.width,
    height: WORDMARK.height,
  },
  module: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MODULE,
    height: MODULE,
    backgroundColor: '#FFFFFF',
  },
});
