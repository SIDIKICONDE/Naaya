import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { controlsStyles as styles } from './styles';
import Slider from '@react-native-community/slider';
import { BLUR_INTENSITY_STEP, MAX_BLUR_INTENSITY, MIN_BLUR_INTENSITY, TINT_PRESETS, CORNER_RADIUS_STEP, MAX_CORNER_RADIUS, MIN_CORNER_RADIUS, HAPTIC_DURATION_STEP, MAX_HAPTIC_DURATION_MS, MIN_HAPTIC_DURATION_MS, TEXT_OPACITY_STEP, MAX_TEXT_OPACITY, MIN_TEXT_OPACITY, HORIZONTAL_PADDING_STEP, MIN_HORIZONTAL_PADDING, MAX_HORIZONTAL_PADDING, VERTICAL_PADDING_STEP, MIN_VERTICAL_PADDING, MAX_VERTICAL_PADDING, MIN_COLUMN_GAP, MAX_COLUMN_GAP, COLUMN_GAP_STEP } from './constants';
import type { TeleprompterControlsProps } from './types';
import { FONT_SIZE_STEP, MAX_FONT_SIZE, MAX_SPEED_PX_PER_SEC, MIN_FONT_SIZE, MIN_SPEED_PX_PER_SEC, SPEED_STEP_PX_PER_SEC } from './constants';

export const TeleprompterControls: React.FC<TeleprompterControlsProps> = memo(({
  onPlayToggle,
  onSpeedChange,
  onFontSizeChange,
  onLineHeightChange,
  onToggleDirection,
  onToggleMirror,
  onJumpToStart,
  onJumpToEnd,
  onToggleGlass,
  onBlurIntensityChange,
  onTintSelect,
  onTintFreeChange,
  onToggleGuideLine,
  onCornerRadiusChange,
  onHapticToggle,
  onHapticDurationChange,
  onTextColorSelect,
  onTextColorFreeChange,
  onTextOpacityChange,
  onHorizontalPaddingChange,
  onVerticalPaddingChange,
  onTwoColumnsToggle,
  onColumnGapChange,
  onTextAlignChange,
  onSplitStrategyChange,
  onApplyPreset,
  onExportConfig,
  onImportConfigRequest,
  isPlaying,
  speedPxPerSec,
  fontSize,
  lineHeightMultiplier,
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
  horizontalPadding,
  verticalPadding,
  twoColumnsEnabled: _twoColumnsEnabled,
  columnGap: _columnGap,
  textAlign: _textAlign,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.playButton, isPlaying && styles.playing]} onPress={onPlayToggle}>
          <Text style={styles.playButtonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.row, styles.rowSpaceBetween]}> 
        <TouchableOpacity style={styles.secondaryButton} onPress={onToggleDirection}>
          <Text style={styles.secondaryText}>{isReversed ? 'Défilement: Bas' : 'Défilement: Haut'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onToggleMirror}>
          <Text style={styles.secondaryText}>{isMirrored ? 'Miroir: On' : 'Miroir: Off'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.row, styles.rowSpaceBetween]}> 
        <TouchableOpacity style={styles.secondaryButton} onPress={onJumpToStart}>
          <Text style={styles.secondaryText}>Début</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onJumpToEnd}>
          <Text style={styles.secondaryText}>Fin</Text>
        </TouchableOpacity>
      </View>

      {/* Effet Verre */}
      <View style={[styles.row, styles.rowSpaceBetween]}> 
        <TouchableOpacity style={styles.secondaryButton} onPress={onToggleGlass}>
          <Text style={styles.secondaryText}>{glassEnabled ? 'Verre: On' : 'Verre: Off'}</Text>
        </TouchableOpacity>
      </View>
      {glassEnabled && (
        <>
          <View style={styles.controlGroup}>
            <Text style={styles.label}>Intensité flou: {Math.round(blurIntensity)}</Text>
            <Slider
              minimumValue={MIN_BLUR_INTENSITY}
              maximumValue={MAX_BLUR_INTENSITY}
              step={BLUR_INTENSITY_STEP}
              value={blurIntensity}
              onValueChange={onBlurIntensityChange}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#cccccc"
              thumbTintColor="#007AFF"
            />
          </View>
          <View style={[styles.row, styles.wrapRow]}> 
            {TINT_PRESETS.map((hex) => (
              <TouchableOpacity
                key={hex}
                style={[styles.tintSwatch, { backgroundColor: hex }, hex === tintColor && styles.tintSwatchActive]}
                onPress={() => onTintSelect(hex)}
              />
            ))}
          </View>
          <View style={[styles.row, styles.alignRow]}> 
            <Text style={styles.label}>Teinte:</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.smallPad]} 
              onPress={() => onTintFreeChange('#FFFFFF')}
            >
              <Text style={styles.secondaryText}>#FFFFFF</Text>
            </TouchableOpacity>
            {/* Astuce: l'app n'intègre pas de color picker natif; on expose un champ simple ou presets étendus si besoin */}
          </View>
        </>
      )}

      {/* Ligne guide et rayon des coins */}
      <View style={[styles.row, styles.rowSpaceBetween]}> 
        <TouchableOpacity style={styles.secondaryButton} onPress={onToggleGuideLine}>
          <Text style={styles.secondaryText}>{showGuideLine ? 'Guide: On' : 'Guide: Off'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controlGroup}>
        <Text style={styles.label}>Rayon coins: {Math.round(cornerRadius)}</Text>
        <Slider
          minimumValue={MIN_CORNER_RADIUS}
          maximumValue={MAX_CORNER_RADIUS}
          step={CORNER_RADIUS_STEP}
          value={cornerRadius}
          onValueChange={onCornerRadiusChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>

      {/* Haptique */}
      <View style={[styles.row, styles.rowSpaceBetweenTop]}> 
        <TouchableOpacity style={styles.secondaryButton} onPress={onHapticToggle}>
          <Text style={styles.secondaryText}>{hapticEnabled ? 'Haptique: On' : 'Haptique: Off'}</Text>
        </TouchableOpacity>
      </View>
      {hapticEnabled && (
        <View style={styles.controlGroup}>
          <Text style={styles.label}>Durée haptique: {Math.round(hapticDurationMs)} ms</Text>
          <Slider
            minimumValue={MIN_HAPTIC_DURATION_MS}
            maximumValue={MAX_HAPTIC_DURATION_MS}
            step={HAPTIC_DURATION_STEP}
            value={hapticDurationMs}
            onValueChange={onHapticDurationChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#cccccc"
            thumbTintColor="#007AFF"
          />
        </View>
      )}

      {/* Style du texte */}
      <View style={styles.controlGroup}>
        <Text style={styles.label}>Opacité texte: {textOpacity.toFixed(2)}</Text>
        <Slider
          minimumValue={MIN_TEXT_OPACITY}
          maximumValue={MAX_TEXT_OPACITY}
          step={TEXT_OPACITY_STEP}
          value={textOpacity}
          onValueChange={onTextOpacityChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>
      <View style={[styles.row, styles.wrapRow]}> 
        {TINT_PRESETS.map((hex) => (
          <TouchableOpacity
            key={hex}
            style={[styles.tintSwatch, { backgroundColor: hex }, hex === textColor && styles.tintSwatchActive]}
            onPress={() => onTextColorSelect(hex)}
          />
        ))}
        <TouchableOpacity style={[styles.secondaryButton, styles.smallPad]} onPress={() => onTextColorFreeChange('#FFFFFF')}> 
          <Text style={styles.secondaryText}>Teinte texte</Text>
        </TouchableOpacity>
      </View>

      {/* Marges/padding */}
      <View style={styles.controlGroup}>
        <Text style={styles.label}>Marge horizontale: {Math.round(horizontalPadding)} px</Text>
        <Slider
          minimumValue={MIN_HORIZONTAL_PADDING}
          maximumValue={MAX_HORIZONTAL_PADDING}
          step={HORIZONTAL_PADDING_STEP}
          value={horizontalPadding}
          onValueChange={onHorizontalPaddingChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>

      {/* Deux colonnes & Alignement */}
      <View style={[styles.row, styles.rowSpaceBetweenTop]}> 
        <TouchableOpacity style={styles.secondaryButton} onPress={onTwoColumnsToggle}>
          <Text style={styles.secondaryText}>{_twoColumnsEnabled ? 'Deux colonnes: On' : 'Deux colonnes: Off'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controlGroup}>
        <Text style={styles.label}>Espace colonnes: {Math.round((_columnGap ?? 24))} px</Text>
        <Slider
          minimumValue={MIN_COLUMN_GAP}
          maximumValue={MAX_COLUMN_GAP}
          step={COLUMN_GAP_STEP}
          value={_columnGap ?? 24}
          onValueChange={onColumnGapChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>
      <View style={[styles.row, styles.rowSpaceAroundTop]}>
        {(['left','center','justify'] as const).map((align) => (
          <TouchableOpacity key={align} style={styles.secondaryButton} onPress={() => onTextAlignChange(align)}>
            <Text style={styles.secondaryText}>{_textAlign === align ? `${align} ✓` : align}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.row, styles.rowSpaceAroundTop]}>
        {(['studio','clair','contraste','studio2cols'] as const).map((p) => (
          <TouchableOpacity key={p} style={styles.secondaryButton} onPress={() => onApplyPreset(p)}>
            <Text style={styles.secondaryText}>{`Preset: ${p}`}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.row, styles.rowSpaceAroundTop]}>
        {(['balanced','byParagraph'] as const).map((mode) => (
          <TouchableOpacity key={mode} style={styles.secondaryButton} onPress={() => onSplitStrategyChange(mode)}>
            <Text style={styles.secondaryText}>{mode}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.row, styles.rowSpaceAroundTop]}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onExportConfig}>
          <Text style={styles.secondaryText}>Exporter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onImportConfigRequest}>
          <Text style={styles.secondaryText}>Importer</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controlGroup}>
        <Text style={styles.label}>Marge verticale: {Math.round(verticalPadding)} px</Text>
        <Slider
          minimumValue={MIN_VERTICAL_PADDING}
          maximumValue={MAX_VERTICAL_PADDING}
          step={VERTICAL_PADDING_STEP}
          value={verticalPadding}
          onValueChange={onVerticalPaddingChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>

      <View style={styles.controlGroup}>
        <Text style={styles.label}>Vitesse: {Math.round(speedPxPerSec)} px/s</Text>
        <Slider
          minimumValue={MIN_SPEED_PX_PER_SEC}
          maximumValue={MAX_SPEED_PX_PER_SEC}
          step={SPEED_STEP_PX_PER_SEC}
          value={speedPxPerSec}
          onValueChange={onSpeedChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>

      <View style={styles.controlGroup}>
        <Text style={styles.label}>Taille du texte: {Math.round(fontSize)} pt</Text>
        <Slider
          minimumValue={MIN_FONT_SIZE}
          maximumValue={MAX_FONT_SIZE}
          step={FONT_SIZE_STEP}
          value={fontSize}
          onValueChange={onFontSizeChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>

      <View style={styles.controlGroup}>
        <Text style={styles.label}>Interligne: {lineHeightMultiplier.toFixed(1)}x</Text>
        <Slider
          minimumValue={1.0}
          maximumValue={2.0}
          step={0.1}
          value={lineHeightMultiplier}
          onValueChange={onLineHeightChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#cccccc"
          thumbTintColor="#007AFF"
        />
      </View>
    </View>
  );
});

TeleprompterControls.displayName = 'TeleprompterControls';

export default TeleprompterControls;