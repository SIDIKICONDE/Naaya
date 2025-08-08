import React, { memo, useCallback } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { GlassScrollText } from '@ui/GlassScrollText';
import type { TeleprompterViewProps } from './types';
import { viewStyles as styles } from './styles';

export const TeleprompterView: React.FC<TeleprompterViewProps> = memo(({
  text,
  offsetY,
  fontSize,
  lineHeightMultiplier,
  horizontalPadding = 24,
  verticalPadding = 16,
  isMirrored = false,
  showGuideLine = true,
  blurIntensity = 35,
  tintColor = '#FFFFFF',
  cornerRadius = 20,
  style,
  textStyle,
  textColor = '#FFFFFF',
  textOpacity = 1.0,
  twoColumnsEnabled = false,
  columnGap = 24,
  textAlign = 'left',
  splitStrategy = 'balanced',
  onContainerLayout,
  onContentLayout,
}) => {
  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    onContainerLayout?.(e.nativeEvent.layout.height);
  }, [onContainerLayout]);

  // onContentLayout traité via GlassScrollText

  return (
    <View style={[styles.container, style]} onLayout={handleContainerLayout}>
      {showGuideLine && (
        <View pointerEvents="none" style={styles.guideLineWrapper}>
          <View style={styles.guideLine} />
        </View>
      )}
      <GlassScrollText
        text={text}
        fontSize={fontSize}
        lineHeightMultiplier={lineHeightMultiplier}
        blurIntensity={blurIntensity}
        tintColor={tintColor}
        cornerRadius={cornerRadius}
        paddingHorizontal={horizontalPadding}
        paddingVertical={verticalPadding}
        offsetY={offsetY}
        onContentLayout={(h) => onContentLayout?.(h)}
        style={isMirrored ? styles.mirrored : ({} as any)}
        textStyle={textStyle as any}
        textColor={textColor}
        textOpacity={textOpacity}
        twoColumnsEnabled={twoColumnsEnabled}
        columnGap={columnGap}
        textAlign={textAlign as any}
        splitStrategy={splitStrategy as any}
      />
    </View>
  );
});

TeleprompterView.displayName = 'TeleprompterView';

export default TeleprompterView;


