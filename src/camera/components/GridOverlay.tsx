import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export interface GridOverlayProps {
  color?: string;
  thickness?: number;
  style?: ViewStyle | ViewStyle[];
  visible?: boolean;
}

/**
 * GridOverlay
 * Affiche une grille (règle des tiers) en overlay, sans capter les interactions.
 */
export const GridOverlay: React.FC<GridOverlayProps> = ({
  color = 'rgba(255,255,255,0.35)',
  thickness = 1,
  style,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.container, style]}> 
      {/* Lignes verticales (2) via colonnes avec bordure gauche sur col2 et col3 */}
      <View style={styles.columnsContainer}>
        <View style={styles.flexCell} />
        <View style={[styles.flexCell, { borderLeftWidth: thickness, borderLeftColor: color }]} />
        <View style={[styles.flexCell, { borderLeftWidth: thickness, borderLeftColor: color }]} />
      </View>

      {/* Lignes horizontales (2) via lignes avec bordure haute sur row2 et row3 */}
      <View style={styles.rowsContainer}>
        <View style={styles.flexCell} />
        <View style={[styles.flexCell, { borderTopWidth: thickness, borderTopColor: color }]} />
        <View style={[styles.flexCell, { borderTopWidth: thickness, borderTopColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  columnsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  rowsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  flexCell: {
    flex: 1,
  },
});

export default GridOverlay;


