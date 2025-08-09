# Interface de Contrôle des Filtres Caméra

Cette interface moderne permet de contrôler les filtres de la caméra avec une intégration native complète avec l'engine FFmpeg Naaya.

## Composants Disponibles

### 1. FilterControls - Interface Complète
Interface principale avec sélection de filtres et contrôle d'intensité.

```tsx
import { FilterControls } from './FilterControls';

<FilterControls
  currentFilter={currentFilter}
  onFilterChange={handleFilterChange}
  onClearFilter={handleClearFilter}
  disabled={false}
  compact={false}
/>
```

### 2. AdvancedFilterControls - Contrôles Avancés
Interface avancée pour les filtres `color_controls` avec paramètres détaillés.

```tsx
import { AdvancedFilterControls } from './AdvancedFilterControls';

<AdvancedFilterControls
  currentFilter={currentFilter}
  onFilterChange={handleFilterChange}
  disabled={false}
  visible={true}
/>
```

### 3. CompactFilterControls - Version Compacte
Version compacte pour intégration dans des interfaces existantes.

```tsx
import { CompactFilterControls } from './CompactFilterControls';

<CompactFilterControls
  currentFilter={currentFilter}
  onFilterChange={handleFilterChange}
  onClearFilter={handleClearFilter}
  disabled={false}
  showLabels={true}
/>
```

## Filtres Disponibles

### Filtres Standard
- **Aucun** (`none`) - Désactive tous les filtres
- **Sépia** (`sepia`) - Effet vintage sépia
- **Noir & Blanc** (`noir`) - Conversion noir et blanc
- **Monochrome** (`monochrome`) - Monochrome avec teinte
- **Vintage** (`vintage`) - Effet années 70
- **Cool** (`cool`) - Effet froid bleuté
- **Warm** (`warm`) - Effet chaud orangé

### Filtre Avancé
- **Contrôles Couleur** (`color_controls`) - Accès aux paramètres avancés :
  - Exposition (-2.0 à 2.0)
  - Ombres (-1.0 à 1.0)
  - Hautes lumières (-1.0 à 1.0)
  - Luminosité (-1.0 à 1.0)
  - Contraste (0.0 à 2.0)
  - Saturation (0.0 à 2.0)
  - Teinte (-180° à 180°)
  - Chaleur (-1.0 à 1.0)
  - Teinte colorimétrique (-1.0 à 1.0)
  - Gamma (0.1 à 3.0)
  - Vignettage (0.0 à 1.0)
  - Grain (0.0 à 1.0)

## Intégration

### Avec VideoControl
L'interface est déjà intégrée dans `VideoControl` avec :
- Bouton de filtres dans les contrôles du haut (🎨)
- Panneau de filtres en bas de l'écran
- Contrôles avancés accessibles pour `color_controls`
- Désactivation automatique pendant l'enregistrement

### Avec useNativeCamera Hook
```tsx
const { 
  availableFilters, 
  currentFilter, 
  setFilter, 
  clearFilter 
} = useNativeCamera();

const handleFilterChange = async (name: string, intensity: number) => {
  return await setFilter(name, intensity);
};

const handleClearFilter = async () => {
  return await clearFilter();
};
```

## Fonctionnalités

### Interface Utilisateur
- **Design moderne** avec glassmorphism et animations
- **Responsive** avec support des différentes tailles d'écran
- **Feedback visuel** avec indicateurs d'état et animations
- **Accessibilité** avec support du mode sombre

### Performance
- **Debounce** sur les sliders pour éviter les appels excessifs
- **Optimisation mémoire** avec React.memo
- **Animations natives** avec Animated API
- **État local** pour fluidité des interactions

### Presets Avancés
L'interface avancée inclut des presets prédéfinis :
- **Reset** - Paramètres par défaut
- **Vivid** - Couleurs vives et contrastées
- **Film** - Style cinématographique
- **Portrait** - Optimisé pour les portraits
- **Dramatic** - Effet dramatique avec vignettage

## Architecture Technique

### Intégration Native
- Connection directe avec le module C++ `NativeCameraFiltersModule`
- Support FFmpeg pour traitement en temps réel
- API cross-platform (iOS/Android)

### État des Filtres
```typescript
interface FilterState {
  name: string;      // Nom du filtre
  intensity: number; // Intensité 0.0-1.0
}

interface AdvancedFilterParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  warmth: number;
  tint: number;
  exposure: number;
  shadows: number;
  highlights: number;
  vignette: number;
  grain: number;
}
```

## Utilisation

1. **Sélection de filtre** : Toucher un filtre pour l'appliquer
2. **Ajustement d'intensité** : Utiliser le slider pour ajuster
3. **Contrôles avancés** : Activer pour `color_controls` uniquement
4. **Presets** : Utiliser les presets prédéfinis pour démarrer rapidement
5. **Désactivation** : Toucher "Aucun" ou utiliser `clearFilter()`

L'interface s'adapte automatiquement selon le contexte d'utilisation et se désactive pendant l'enregistrement vidéo pour préserver les performances.
