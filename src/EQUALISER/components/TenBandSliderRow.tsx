import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EqualiserBand, EqualiserTheme, SpectrumAnalyserData } from '../types';
import { FrequencyBandSlider } from './FrequencyBandSlider';

interface TenBandSliderRowProps {
  bands: EqualiserBand[];
  spectrumData: SpectrumAnalyserData | null;
  soloedBandId: string | null;
  disabled?: boolean;
  theme: EqualiserTheme;
  onGainChange: (bandId: string, gain: number) => void;
  onSolo: (bandId: string) => void;
}

export const TenBandSliderRow: React.FC<TenBandSliderRowProps> = ({
  bands,
  spectrumData,
  soloedBandId,
  disabled = false,
  theme,
  onGainChange,
  onSolo,
}) => {
  const simpleBands = useMemo(() => {
    return [...bands]
      .sort((a, b) => a.index - b.index)
      .slice(0, 10);
  }, [bands]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.content}
      >
        {simpleBands.map((band) => (
          <FrequencyBandSlider
            key={band.id}
            band={band}
            magnitude={spectrumData?.magnitudes[band.index] || 0}
            onGainChange={onGainChange}
            onSolo={() => onSolo(band.id)}
            isSoloed={soloedBandId === band.id}
            disabled={disabled}
            theme={theme}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    paddingHorizontal: 4,
    gap: 8,
  },
});

export default TenBandSliderRow;


