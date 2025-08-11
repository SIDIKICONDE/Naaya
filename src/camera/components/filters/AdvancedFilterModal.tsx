/**
 * Modal avancé optimisé pour les contrôles de filtres professionnels
 * Utilise la mémorisation et le lazy loading pour les performances
 */
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { AdvancedFilterParams } from '../../../../specs/NativeCameraFiltersModule';
import { ANIMATION_CONFIG, DEFAULT_FILTER_PARAMS } from './constants';
import NumberLineControl from './slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types pour les ajustements
type AdjustmentType = keyof AdvancedFilterParams;

interface AdjustmentConfig {
  readonly name: AdjustmentType;
  readonly label: string;
  readonly icon: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly defaultValue: number;
  readonly unit?: string;
  readonly description: string;
  readonly category: 'basic' | 'color' | 'tone' | 'effects';
}

// Configuration des ajustements
const ADJUSTMENTS_CONFIG: readonly AdjustmentConfig[] = Object.freeze([
  // Ajustements de base
  {
    name: 'brightness',
    label: 'Luminosité',
    icon: '☀️',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Ajuste la luminosité globale',
    category: 'basic',
  },
  {
    name: 'contrast',
    label: 'Contraste',
    icon: '◐',
    min: 0.5,
    max: 2,
    step: 0.01,
    defaultValue: 1,
    description: 'Modifie le contraste de l\'image',
    category: 'basic',
  },
  {
    name: 'exposure',
    label: 'Exposition',
    icon: '📷',
    min: -2,
    max: 2,
    step: 0.01,
    defaultValue: 0,
    unit: 'EV',
    description: 'Simule l\'exposition de la caméra',
    category: 'basic',
  },
  // Ajustements de couleur
  {
    name: 'saturation',
    label: 'Saturation',
    icon: '🎨',
    min: 0,
    max: 2,
    step: 0.01,
    defaultValue: 1,
    description: 'Intensité des couleurs',
    category: 'color',
  },
  {
    name: 'hue',
    label: 'Teinte',
    icon: '🌈',
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    unit: '°',
    description: 'Rotation de la roue chromatique',
    category: 'color',
  },
  {
    name: 'warmth',
    label: 'Température',
    icon: '🌡️',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Balance des blancs (froid/chaud)',
    category: 'color',
  },
  {
    name: 'tint',
    label: 'Teinte',
    icon: '💜',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Balance vert/magenta',
    category: 'color',
  },
  // Ajustements de tonalité
  {
    name: 'shadows',
    label: 'Ombres',
    icon: '🌑',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Éclaircit ou assombrit les ombres',
    category: 'tone',
  },
  {
    name: 'highlights',
    label: 'Hautes lumières',
    icon: '🌕',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Récupère les détails dans les zones claires',
    category: 'tone',
  },
  {
    name: 'gamma',
    label: 'Gamma',
    icon: 'γ',
    min: 0.5,
    max: 2,
    step: 0.01,
    defaultValue: 1,
    description: 'Courbe de correction gamma',
    category: 'tone',
  },
  // Effets
  {
    name: 'vignette',
    label: 'Vignettage',
    icon: '⭕',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Assombrissement des bords',
    category: 'effects',
  },
  {
    name: 'grain',
    label: 'Grain',
    icon: '⚫',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    description: 'Ajoute du grain filmique',
    category: 'effects',
  },
] as const);

// Groupes d'ajustements par catégorie
const ADJUSTMENT_CATEGORIES = Object.freeze({
  basic: { label: 'Basique', icon: '⚡', color: '#3498DB' },
  color: { label: 'Couleur', icon: '🎨', color: '#E74C3C' },
  tone: { label: 'Tonalité', icon: '📊', color: '#F39C12' },
  effects: { label: 'Effets', icon: '✨', color: '#9B59B6' },
} as const);

/**
 * Composant pour un slider d'ajustement individuel
 */
const AdjustmentSlider = memo<{
  config: AdjustmentConfig;
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
}>(
  ({ config, value, onChange, onReset }) => {
    const isModified = value !== config.defaultValue;
    const animatedValue = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: isModified ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [isModified, animatedValue]);

    const handleChange = useCallback(
      (val: number) => {
        const rounded = Math.round(val / config.step) * config.step;
        onChange(rounded);
      },
      [onChange, config.step]
    );

    const displayValue = useMemo(() => {
      const val = Math.round(value * 100) / 100;
      return config.unit ? `${val}${config.unit}` : val.toString();
    }, [value, config.unit]);

    return (
      <Animated.View
        style={[
          styles.adjustmentContainer,
          {
            backgroundColor: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'],
            }),
          },
        ]}
      >
        <View style={styles.adjustmentHeader}>
          <View style={styles.adjustmentInfo}>
            <Text style={styles.adjustmentIcon}>{config.icon}</Text>
            <View>
              <Text style={styles.adjustmentLabel}>{config.label}</Text>
              <Text style={styles.adjustmentDescription}>{config.description}</Text>
            </View>
          </View>
          <View style={styles.adjustmentActions}>
            <Text style={[styles.adjustmentValue, isModified && styles.adjustmentValueModified]}>
              {displayValue}
            </Text>
            {isModified && (
              <TouchableOpacity onPress={onReset} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>↺</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <NumberLineControl
          value={value}
          onValueChange={handleChange}
          onSlidingComplete={handleChange}
          min={config.min}
          max={config.max}
          step={config.step}
          width={SCREEN_WIDTH - 80}
          color={isModified ? '#007AFF' : 'rgba(255,255,255,0.3)'}
        />
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.config.name === nextProps.config.name
    );
  }
);

AdjustmentSlider.displayName = 'AdjustmentSlider';

/**
 * Onglets de catégories
 */
const CategoryTabs = memo<{
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}>(({ selectedCategory, onSelectCategory }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {Object.entries(ADJUSTMENT_CATEGORIES).map(([key, category]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.tab,
            selectedCategory === key && styles.tabSelected,
            { borderColor: category.color },
          ]}
          onPress={() => onSelectCategory(key)}
        >
          <Text style={styles.tabIcon}>{category.icon}</Text>
          <Text style={[styles.tabLabel, selectedCategory === key && styles.tabLabelSelected]}>
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

CategoryTabs.displayName = 'CategoryTabs';

/**
 * Interface des props du modal
 */
export interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (params: AdvancedFilterParams) => Promise<void>;
  initialParams?: Partial<AdvancedFilterParams>;
}

/**
 * Modal principal des filtres avancés
 */
export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = memo(
  ({ visible, onClose, onApply, initialParams }) => {
    // État local optimisé
    const [params, setParams] = useState<AdvancedFilterParams>(() => ({
      ...DEFAULT_FILTER_PARAMS,
      ...initialParams,
    }));
    const [selectedCategory, setSelectedCategory] = useState('basic');
    const [isApplying, setIsApplying] = useState(false);

    // Mémorisation des ajustements filtrés
    const filteredAdjustments = useMemo(
      () => ADJUSTMENTS_CONFIG.filter(adj => adj.category === selectedCategory),
      [selectedCategory]
    );

    // Vérifier si des modifications ont été faites
    const hasModifications = useMemo(() => {
      return Object.entries(params).some(
        ([key, value]) => value !== DEFAULT_FILTER_PARAMS[key as AdjustmentType]
      );
    }, [params]);

    // Callbacks mémorisés
    const handleAdjustmentChange = useCallback(
      (name: AdjustmentType) => (value: number) => {
        setParams(prev => ({ ...prev, [name]: value }));
      },
      []
    );

    const handleReset = useCallback((name: AdjustmentType) => {
      setParams(prev => ({ ...prev, [name]: DEFAULT_FILTER_PARAMS[name] }));
    }, []);

    const handleResetAll = useCallback(() => {
      setParams(DEFAULT_FILTER_PARAMS);
    }, []);

    const handleApply = useCallback(async () => {
      setIsApplying(true);
      try {
        await onApply(params);
        onClose();
      } finally {
        setIsApplying(false);
      }
    }, [params, onApply, onClose]);

    // Animation d'entrée
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    React.useEffect(() => {
      if (visible) {
        Animated.spring(slideAnim, {
          toValue: 0,
          ...ANIMATION_CONFIG.modalAnimation,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }, [visible, slideAnim]);

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <LinearGradient
              colors={['rgba(20, 20, 30, 0.98)', 'rgba(20, 20, 30, 0.95)']}
              style={styles.header}
            >
              <Text style={styles.title}>Ajustements Professionnels</Text>
              <View style={styles.headerActions}>
                {hasModifications && (
                  <TouchableOpacity onPress={handleResetAll} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>Réinitialiser</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Onglets de catégories */}
            <CategoryTabs
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Liste des ajustements */}
            <ScrollView
              style={styles.adjustmentsList}
              contentContainerStyle={styles.adjustmentsContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredAdjustments.map(config => (
                <AdjustmentSlider
                  key={config.name}
                  config={config}
                  value={params[config.name]}
                  onChange={handleAdjustmentChange(config.name)}
                  onReset={() => handleReset(config.name)}
                />
              ))}
            </ScrollView>

            {/* Actions du bas */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.actionButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.applyButton,
                  !hasModifications && styles.applyButtonDisabled,
                ]}
                onPress={handleApply}
                disabled={!hasModifications || isApplying}
              >
                {isApplying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>Appliquer</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

AdvancedFilterModal.displayName = 'AdvancedFilterModal';

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(20, 20, 30, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },

  // Tabs
  tabsContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 6,
  },
  tabSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabLabelSelected: {
    color: '#FFFFFF',
  },

  // Adjustments
  adjustmentsList: {
    flex: 1,
  },
  adjustmentsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  adjustmentContainer: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adjustmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  adjustmentIcon: {
    fontSize: 20,
  },
  adjustmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  adjustmentDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  adjustmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustmentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: 50,
    textAlign: 'right',
  },
  adjustmentValueModified: {
    color: '#007AFF',
  },
  resetButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  adjustmentSlider: {
    alignSelf: 'center',
  },

  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdvancedFilterModal;
