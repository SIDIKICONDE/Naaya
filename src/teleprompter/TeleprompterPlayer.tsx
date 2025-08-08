import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TeleprompterControls } from './TeleprompterControls';
import { TeleprompterView } from './TeleprompterView';
import { useTeleprompter } from './hooks';
import type { TeleprompterPlayerProps } from './types';
import type { UseTeleprompterOptions } from './hooks';
import { DEFAULT_FONT_SIZE, DEFAULT_HORIZONTAL_PADDING, DEFAULT_LINE_HEIGHT_MULTIPLIER, DEFAULT_SPEED_PX_PER_SEC, DEFAULT_VERTICAL_PADDING } from './constants';
import { ColorPickerPopover } from '@ui/ColorPickerPopover';
import { ConfigModal } from '@ui/ConfigModal';

const TeleprompterPlayerComponent: React.FC<TeleprompterPlayerProps> = ({
  text,
  initialIsPlaying = false,
  initialSpeedPxPerSec = DEFAULT_SPEED_PX_PER_SEC,
  initialFontSize = DEFAULT_FONT_SIZE,
  initialLineHeightMultiplier = DEFAULT_LINE_HEIGHT_MULTIPLIER,
  horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
  verticalPadding = DEFAULT_VERTICAL_PADDING,
  onEndReached,
  initialIsReversed = false,
  initialIsMirrored = false,
  initialGlassEnabled = true,
  initialBlurIntensity = 35,
  initialTintColor = '#FFFFFF',
  initialShowGuideLine = true,
  initialCornerRadius = 20,
  style,
  textStyle,
  showControls = true,
}) => {
  const options: UseTeleprompterOptions = {
    initialText: text,
    initialIsPlaying,
    initialSpeedPxPerSec,
    initialFontSize,
    initialLineHeightMultiplier,
    initialIsReversed,
    initialIsMirrored,
    initialGlassEnabled,
    initialBlurIntensity,
    initialTintColor,
    initialShowGuideLine,
    initialCornerRadius,
    horizontalPadding,
    verticalPadding,
  };
  if (onEndReached) {
    options.onEndReached = () => onEndReached();
  }

  const {
    isPlaying,
    speedPxPerSec,
    fontSize,
    lineHeightMultiplier,
    offsetY,
    isReversed,
    isMirrored,
    glassEnabled,
    blurIntensity,
    tintColor,
    showGuideLine,
    cornerRadius,
    hapticEnabled,
    hapticDurationMs,
    textColor,
    textOpacity,
    horizontalPadding: currentHorizontalPadding,
    verticalPadding: currentVerticalPadding,
    twoColumnsEnabled,
    columnGap,
    textAlign,
    splitStrategy,
    togglePlay,
    setSpeed,
    setFontSize,
    setLineHeight,
    toggleDirection,
    toggleMirror,
    toggleGlass,
    setBlurIntensity,
    setTintColor,
    setShowGuideLine,
    setCornerRadius,
    setHapticEnabled,
    setHapticDurationMs,
    setTextColor,
    setTextOpacity,
    setHorizontalPadding,
    setVerticalPadding,
    setTwoColumnsEnabled,
    setColumnGap,
    setTextAlign,
    setSplitStrategy,
    applyPreset,
    exportConfig,
    importConfig,
    containerHeightRef,
    contentHeightRef,
    setOffsetY,
  } = useTeleprompter(options);

  const handleContainerLayout = useCallback((h: number) => { containerHeightRef.current = h; }, [containerHeightRef]);
  const handleContentLayout = useCallback((h: number) => { contentHeightRef.current = h; }, [contentHeightRef]);

  const jumpToStart = useCallback(() => {
    setOffsetY(0);
  }, [setOffsetY]);

  const jumpToEnd = useCallback(() => {
    const max = Math.max(0, contentHeightRef.current - containerHeightRef.current);
    setOffsetY(max);
  }, [contentHeightRef, containerHeightRef, setOffsetY]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [_exportedConfig, _setExportedConfig] = useState<string | null>(null);
  const [_importJson, _setImportJson] = useState<string | null>(null);
  const [configModal, setConfigModal] = useState<{ visible: boolean; mode: 'export'|'import' } | null>(null);

  return (
    <View style={[styles.container, style]}>
      <ColorPickerPopover
        visible={showColorPicker}
        initialHex={tintColor}
        onChange={(hex) => setTintColor(hex)}
        onClose={() => setShowColorPicker(false)}
        onOpenRequest={() => setShowColorPicker(true)}
        showOpenHandle={!showColorPicker}
        hapticEnabled={hapticEnabled}
        hapticDurationMs={hapticDurationMs}
      />
      <ConfigModal
        visible={!!configModal}
        mode={(configModal?.mode ?? 'export')}
        exportedText={configModal?.mode === 'export' ? exportConfig() : ''}
        onClose={() => setConfigModal(null)}
        onSubmitImport={(json) => setTimeout(() => { try { importConfig(json); } catch {} }, 0)}
      />
      <TeleprompterView
        text={text}
        offsetY={offsetY}
        fontSize={fontSize}
        lineHeightMultiplier={lineHeightMultiplier}
        isMirrored={isMirrored}
        glassEnabled={glassEnabled}
        blurIntensity={blurIntensity}
        tintColor={tintColor}
        cornerRadius={cornerRadius}
        horizontalPadding={currentHorizontalPadding}
        verticalPadding={currentVerticalPadding}
        textColor={textColor}
        textOpacity={textOpacity}
        textStyle={textStyle}
        onContainerLayout={handleContainerLayout}
        onContentLayout={handleContentLayout}
        twoColumnsEnabled={twoColumnsEnabled}
        columnGap={columnGap}
        textAlign={textAlign}
        splitStrategy={splitStrategy}
      />
      {showControls && (
        <TeleprompterControls
          onPlayToggle={togglePlay}
          onSpeedChange={setSpeed}
          onFontSizeChange={setFontSize}
          onLineHeightChange={setLineHeight}
          onToggleDirection={toggleDirection}
          onToggleMirror={toggleMirror}
          onJumpToStart={jumpToStart}
          onJumpToEnd={jumpToEnd}
          onToggleGlass={toggleGlass}
          onBlurIntensityChange={setBlurIntensity}
          onTintSelect={setTintColor}
          onTintFreeChange={(hex) => { setTintColor(hex); setShowColorPicker(true); }}
          onToggleGuideLine={() => setShowGuideLine(!showGuideLine)}
          onCornerRadiusChange={setCornerRadius}
          onHapticToggle={() => setHapticEnabled(!hapticEnabled)}
          onHapticDurationChange={setHapticDurationMs}
          onTextColorSelect={setTextColor}
          onTextColorFreeChange={(hex) => { setTextColor(hex); setShowColorPicker(true); }}
          onTextOpacityChange={setTextOpacity}
          onHorizontalPaddingChange={setHorizontalPadding}
          onVerticalPaddingChange={setVerticalPadding}
          onTwoColumnsToggle={() => setTwoColumnsEnabled(!twoColumnsEnabled)}
          onColumnGapChange={setColumnGap}
          onTextAlignChange={setTextAlign}
          onSplitStrategyChange={setSplitStrategy}
          onApplyPreset={(name) => applyPreset(name)}
          onExportConfig={() => setConfigModal({ visible: true, mode: 'export' })}
          onImportConfigRequest={() => setConfigModal({ visible: true, mode: 'import' })}
          isPlaying={isPlaying}
          speedPxPerSec={speedPxPerSec}
          fontSize={fontSize}
          lineHeightMultiplier={lineHeightMultiplier}
          isReversed={isReversed}
          isMirrored={isMirrored}
          glassEnabled={glassEnabled}
          blurIntensity={blurIntensity}
          tintColor={tintColor}
          showGuideLine={showGuideLine}
          cornerRadius={cornerRadius}
          hapticEnabled={hapticEnabled}
          hapticDurationMs={hapticDurationMs}
          textColor={textColor}
          textOpacity={textOpacity}
          horizontalPadding={currentHorizontalPadding}
          verticalPadding={currentVerticalPadding}
          twoColumnsEnabled={twoColumnsEnabled}
          columnGap={columnGap}
          textAlign={textAlign}
        />
      )}
    </View>
  );
};

const TeleprompterPlayer = memo(TeleprompterPlayerComponent);

TeleprompterPlayer.displayName = 'TeleprompterPlayer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default TeleprompterPlayer;


