import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

export interface NumberLineControlProps {
  value: number;
  min: number;
  max: number;
  step: number;
  width: number;
  color: string;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}

const ITEM_WIDTH = 36;

export const NumberLineControl: React.FC<NumberLineControlProps> = memo(({
  value,
  min,
  max,
  step,
  width,
  color,
  disabled = false,
  onValueChange,
  onSlidingComplete,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState<number>(width);
  const centerOffset = useMemo(() => containerWidth / 2 - ITEM_WIDTH / 2, [containerWidth]);
  const itemsCount = useMemo(() => Math.round((max - min) / step) + 1, [min, max, step]);

  const clampIndex = useCallback((i: number) => Math.max(0, Math.min(itemsCount - 1, i)), [itemsCount]);
  const valueFromIndex = useCallback((i: number) => min + i * step, [min, step]);
  const indexFromValue = useCallback((v: number) => clampIndex(Math.round((v - min) / step)), [min, step, clampIndex]);

  const initialIndex = useMemo(() => indexFromValue(value), [indexFromValue, value]);
  const lastIndexRef = useRef<number>(initialIndex);

  // Positionner au bon offset au montage et quand taille change
  useEffect(() => {
    const i = indexFromValue(value);
    lastIndexRef.current = i;
    const x = i * ITEM_WIDTH - centerOffset;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x, animated: false }));
  }, [value, indexFromValue, centerOffset]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (disabled) return;
    const x = e.nativeEvent.contentOffset.x + centerOffset;
    const i = clampIndex(Math.round(x / ITEM_WIDTH));
    if (i !== lastIndexRef.current) {
      lastIndexRef.current = i;
      onValueChange(valueFromIndex(i));
    }
  }, [centerOffset, clampIndex, disabled, onValueChange, valueFromIndex]);

  const snapToNearest = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x + centerOffset;
    const i = clampIndex(Math.round(x / ITEM_WIDTH));
    const targetX = i * ITEM_WIDTH - centerOffset;
    scrollRef.current?.scrollTo({ x: targetX, animated: true });
    const v = valueFromIndex(i);
    onSlidingComplete(v);
  }, [centerOffset, clampIndex, valueFromIndex, onSlidingComplete]);

  const ticks = useMemo(() => new Array(itemsCount).fill(0).map((_, i) => i), [itemsCount]);

  return (
    <View
      style={[styles.container, { width: containerWidth, opacity: disabled ? 0.5 : 1 }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {/* Indicateur central */}
      <View style={[styles.centerIndicator, { left: containerWidth / 2 - 1, backgroundColor: color }]} />

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={snapToNearest}
        onScrollEndDrag={snapToNearest}
        contentContainerStyle={{ paddingHorizontal: centerOffset }}
      >
        {ticks.map((i) => {
          const major = i % Math.round(1 / step) === 0 || i === 0 || i === itemsCount - 1;
          const labelEvery = Math.max(1, Math.round((1 / step) / 4));
          const showLabel = i % labelEvery === 0 || i === 0 || i === itemsCount - 1;
          return (
            <View key={i} style={styles.tickItem}>
              <View style={[styles.tick, { height: major ? 18 : 10, backgroundColor: color }]} />
              {showLabel && (
                <Text style={styles.label}>
                  {Math.round((valueFromIndex(i) + Number.EPSILON) * 100) / 100}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 56,
    justifyContent: 'center',
  },
  centerIndicator: {
    position: 'absolute',
    width: 2,
    height: 24,
    top: 4,
    zIndex: 2,
    borderRadius: 1,
    opacity: 0.9,
  },
  tickItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  tick: {
    width: 2,
    borderRadius: 1,
    opacity: 0.8,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});

export default NumberLineControl;


