import type { NativeTabBarItem } from '@app/bridge';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  type LayoutChangeEvent,
  type View,
} from 'react-native';
import { indexAtOffset, pillOffsetAt } from './native-tab-bar';

const PILL_MOVE_MS = 200; // 알약 이동 시간(웹과 같은 200ms, docs/architecture/motion.md의 300ms 이하)
const SCRUB_THRESHOLD = 6; // 이만큼 넘게 움직이면 탭이 아니라 끌기(웹과 같은 6px)
const PILL_SCALE_HELD = 1.12; // 누르고 있는 동안 알약 배율(웹과 같은 값)
const PILL_SCALE_DIP = 0.95; // 놓은 뒤 잠깐 작아지는 배율
const ARRIVE_MS = 150; // 탭으로 이동할 때 알약이 새 항목에 거의 닿는 시점
const ease = Easing.inOut(Easing.ease);

type Params = {
  items: NativeTabBarItem[];
  selectedIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  onSelect: (id: string) => void;
};

export function useNativeTabBarGesture({ items, selectedIndex, onSelect }: Params) {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const itemWidth = items.length > 0 ? area.width / items.length : 0;
  const pillX = useRef(new Animated.Value(0)).current;
  const pillScale = useRef(new Animated.Value(1)).current;
  const rowRef = useRef<View>(null);
  const originX = useRef(0); // 막대 안쪽 영역의 화면 x 좌표(터치의 pageX를 막대 기준으로 바꾸기 위해)
  const isMotionReduced = useRef(false);
  const isPlaced = useRef(false);
  const prevIndex = useRef(selectedIndex);
  // 확대된 상태에서 놓을 때 마무리 모션의 크기 불연속 방지
  const isReleasedEnlarged = useRef(false);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  // 알약 도착 전 아이콘·라벨이 먼저 바뀌는 현상 방지
  const [lag, setLag] = useState<{ sel: number; from: number | null }>({
    sel: selectedIndex,
    from: null,
  });
  const [canSkipLag, setCanSkipLag] = useState(false);
  if (lag.sel !== selectedIndex) {
    const hasMoved = lag.sel >= 0 && selectedIndex >= 0;
    setLag({
      sel: selectedIndex,
      from: hasMoved && !canSkipLag && !isMotionReduced.current ? lag.sel : null,
    });
    setCanSkipLag(false);
  }

  // 최초 생성한 PanResponder 핸들러에서 최신 값 참조
  const latest = useRef({
    itemCount: items.length,
    selectedIndex,
    itemWidth,
    area,
    items,
    onSelect,
  });
  latest.current = { itemCount: items.length, selectedIndex, itemWidth, area, items, onSelect };
  const press = useRef<{ startX: number; isHeld: boolean; isScrubbing: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    let changed = false;
    const updateMotion = (enabled: boolean) => {
      isMotionReduced.current = enabled;
      if (!enabled) return;
      pillX.stopAnimation();
      pillScale.stopAnimation();
      pillX.setValue(Math.max(latest.current.selectedIndex, 0) * latest.current.itemWidth);
      pillScale.setValue(1);
      setLag((value) => ({ ...value, from: null }));
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      changed = true;
      updateMotion(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active && !changed) updateMotion(enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, [pillX, pillScale]);

  useEffect(() => {
    if (lag.from === null) return;
    const timer = setTimeout(() => setLag((value) => ({ ...value, from: null })), ARRIVE_MS);
    return () => clearTimeout(timer);
  }, [lag]);

  const timing = (value: Animated.Value, toValue: number, duration: number) =>
    Animated.timing(value, { toValue, duration, easing: ease, useNativeDriver: true });

  const settle = (from: number) => {
    if (isMotionReduced.current) {
      pillScale.setValue(1);
      return;
    }
    pillScale.setValue(from > 1 ? from : 1);
    Animated.sequence(
      from > 1
        ? [timing(pillScale, PILL_SCALE_DIP, 126), timing(pillScale, 1, 154)]
        : [
            timing(pillScale, PILL_SCALE_HELD, 105),
            timing(pillScale, PILL_SCALE_DIP, 105),
            timing(pillScale, 1, 90),
          ],
    ).start();
  };

  useEffect(() => {
    if (selectedIndex < 0 || itemWidth === 0) return;
    const target = selectedIndex * itemWidth;
    const hasMoved = prevIndex.current !== selectedIndex && prevIndex.current >= 0;
    const isEnlarged = isReleasedEnlarged.current;
    isReleasedEnlarged.current = false;
    prevIndex.current = selectedIndex;
    if (!isPlaced.current || isMotionReduced.current) {
      pillX.setValue(target);
      isPlaced.current = true;
      return;
    }
    timing(pillX, target, PILL_MOVE_MS).start();
    if (hasMoved) settle(isEnlarged ? PILL_SCALE_HELD : 1);
    // ref와 Animated 값만 사용하는 timing·settle은 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, itemWidth, pillX]);

  const indexAt = (pageX: number) =>
    indexAtOffset(pageX - originX.current, latest.current.itemWidth, latest.current.itemCount);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const isHeld = indexAt(event.nativeEvent.pageX) === latest.current.selectedIndex;
        press.current = { startX: event.nativeEvent.pageX, isHeld, isScrubbing: false };
        if (isHeld && !isMotionReduced.current)
          timing(pillScale, PILL_SCALE_HELD, PILL_MOVE_MS).start();
      },
      onPanResponderMove: (event) => {
        const current = press.current;
        if (!current) return;
        const { pageX } = event.nativeEvent;
        if (!current.isScrubbing && Math.abs(pageX - current.startX) < SCRUB_THRESHOLD) return;
        if (!current.isScrubbing) {
          current.isScrubbing = true;
          if (!isMotionReduced.current) timing(pillScale, PILL_SCALE_HELD, PILL_MOVE_MS).start();
        }
        const { itemWidth: width, area: box } = latest.current;
        pillX.stopAnimation();
        pillX.setValue(pillOffsetAt(pageX - originX.current, width, box.width));
        setScrubIndex(indexAt(pageX));
      },
      onPanResponderRelease: (event) => {
        const current = press.current;
        press.current = null;
        setScrubIndex(null);
        const { items: list, selectedIndex: selected, itemWidth: width } = latest.current;
        const target = indexAt(event.nativeEvent.pageX);
        const hasScrubbed = !!current?.isScrubbing;
        if (target !== selected) {
          // 끌어 놓은 위치에서는 아이콘·라벨을 즉시 활성화
          isReleasedEnlarged.current = hasScrubbed;
          setCanSkipLag(hasScrubbed);
          latest.current.onSelect(list[target].id);
          if (!hasScrubbed) pillScale.setValue(1);
          return;
        }
        if (hasScrubbed) {
          if (isMotionReduced.current) pillX.setValue(selected * width);
          else timing(pillX, selected * width, PILL_MOVE_MS).start();
        }
        if (hasScrubbed || current?.isHeld) settle(PILL_SCALE_HELD);
      },
      onPanResponderTerminate: () => {
        press.current = null;
        setScrubIndex(null);
        const { selectedIndex: selected, itemWidth: width } = latest.current;
        if (isMotionReduced.current) {
          pillX.setValue(Math.max(selected, 0) * width);
          pillScale.setValue(1);
        } else {
          timing(pillX, Math.max(selected, 0) * width, PILL_MOVE_MS).start();
          timing(pillScale, 1, PILL_MOVE_MS).start();
        }
      },
    }),
  ).current;

  const handleRowLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
    rowRef.current?.measureInWindow((x) => {
      originX.current = x;
    });
  };

  return {
    rowRef,
    area,
    itemWidth,
    pillX,
    pillScale,
    /** 접근성 선택 상태와 별개인 아이콘·라벨 표시 항목 */
    visualIndex: scrubIndex ?? lag.from ?? selectedIndex,
    rowProps: { ...panResponder.panHandlers, onLayout: handleRowLayout },
  };
}
