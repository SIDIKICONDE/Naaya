import React, { memo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface TimerProps {
  seconds: number;
  blinkOpacity: Animated.Value;
}

function format(duration: number): string {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const Timer: React.FC<TimerProps> = memo(({ seconds, blinkOpacity }) => {
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity: blinkOpacity }]} />
      <Text style={styles.text}>{format(seconds)}</Text>
    </View>
  );
});

Timer.displayName = 'Timer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF453A',
    marginRight: 12,
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default Timer;


