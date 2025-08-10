# Égaliseur Audio Professionnel

Interface d'égaliseur audio professionnelle complète et modulaire pour React Native.

## 🎵 Caractéristiques

- **Interface moderne et intuitive** avec thèmes clair/sombre
- **10 bandes de fréquences** (mode simple uniquement)
- **Visualisation en temps réel** du spectre audio
- **Préréglages professionnels** organisés par catégories :
  - Genres musicaux (Rock, Jazz, Electronic, Classical)
  - Optimisations vocales (Voix masculine/féminine, Podcast)
  - Instruments (Guitare, Piano)
  - Environnements (Casque, Petite pièce)
- **Graphique de réponse en fréquence** interactif
- **Contrôles avancés** : gains d'entrée/sortie
- **Import/Export** de configurations
- **Animations fluides** et retour haptique
- **Architecture modulaire** et réutilisable

## 📦 Installation

```bash
# Assurez-vous d'avoir les dépendances nécessaires
npm install react-native-svg
# ou
yarn add react-native-svg
```

## 🚀 Utilisation rapide

```tsx
import React from 'react';
import { View } from 'react-native';
import { EqualiserMain } from './src/EQUALISER';

function App() {
  return (
    <View style={{ flex: 1 }}>
      <EqualiserMain 
        theme="dark"
        onClose={() => console.log('Fermé')}
        showAdvancedControls={true}
      />
    </View>
  );
}
```

## 🔧 API détaillée

### Composant principal : `EqualiserMain`

```tsx
interface EqualiserMainProps {
  theme?: 'light' | 'dark';          // Thème de l'interface
  onClose?: () => void;              // Callback de fermeture
  showAdvancedControls?: boolean;    // Afficher les contrôles avancés
  enableAutomation?: boolean;        // Activer l'automation (futur)
}
```

### Hook personnalisé : `useEqualiser`

```tsx
const {
  // État
  enabled,              // Égaliseur actif/inactif
  bypassed,            // Mode bypass
  bands,               // Tableau des bandes de fréquences
  currentPreset,       // ID du préréglage actuel
  spectrumData,        // Données du spectre en temps réel
  
  // Actions
  setEnabled,          // Activer/désactiver
  setBypass,           // Activer/désactiver le bypass
  setBandGain,         // Modifier le gain d'une bande
  setPreset,           // Appliquer un préréglage
  resetAllBands,       // Réinitialiser toutes les bandes
  
  // Configuration
  exportConfig,        // Exporter la configuration JSON
  importConfig,        // Importer une configuration
} = useEqualiser({
  enableSpectrum: true,
  autoSave: true,
});
```

### Utilisation avancée avec hooks spécialisés

```tsx
// Hook pour le spectre uniquement
const { data, isActive, start, stop } = useEqualiserSpectrum();

// Hook pour les préréglages
const { current, setPreset, byCategory } = useEqualiserPresets();
```

## 🎨 Personnalisation

### Créer un thème personnalisé

```tsx
const customTheme: EqualiserTheme = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  background: '#1A1A2E',
  surface: '#16213E',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2C2C3E',
  danger: '#E74C3C',
  warning: '#F39C12',
  success: '#27AE60',
  grid: '#2C2C3E',
  spectrum: {
    gradient: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    peakColor: '#FFD93D',
  },
};
```

### Ajouter des préréglages personnalisés

```tsx
const customPreset: EqualiserPreset = {
  id: 'mon-preset',
  name: 'Mon Préréglage',
  icon: '🎵',
  description: 'Mes réglages favoris',
  category: 'custom',
  bands: {
    'band-32': 3,
    'band-64': 2,
    'band-125': 0,
    'band-250': -1,
    'band-500': 0,
    'band-1k': 2,
    'band-2k': 3,
    'band-4k': 2,
    'band-8k': 1,
    'band-16k': 0,
  },
};
```

## 📱 Exemples d'intégration

### Dans une application audio

```tsx
import { EqualiserMain, useEqualiser } from './src/EQUALISER';

function AudioPlayer() {
  const { enabled, bands } = useEqualiser();
  
  // Appliquer les gains aux nœuds audio
  useEffect(() => {
    if (enabled) {
      bands.forEach(band => {
        // Appliquer band.gain à la fréquence band.frequency
        audioContext.setFilterGain(band.frequency, band.gain);
      });
    }
  }, [enabled, bands]);
  
  return <EqualiserMain />;
}
```

### Mode modal

```tsx
function App() {
  const [showEqualiser, setShowEqualiser] = useState(false);
  
  return (
    <>
      <TouchableOpacity onPress={() => setShowEqualiser(true)}>
        <Text>Ouvrir l'égaliseur</Text>
      </TouchableOpacity>
      
      <Modal visible={showEqualiser} animationType="slide">
        <EqualiserMain 
          onClose={() => setShowEqualiser(false)}
        />
      </Modal>
    </>
  );
}
```

## 🛠️ Architecture

```
EQUALISER/
├── components/          # Composants React
│   ├── EqualiserMain.tsx
│   ├── FrequencyBandSlider.tsx
│   ├── PresetManager.tsx
│   ├── SpectrumAnalyser.tsx
│   └── ...
├── services/           # Logique métier
│   └── EqualiserService.ts
├── hooks/              # Hooks personnalisés
│   └── useEqualiser.ts
├── types/              # Types TypeScript
├── constants/          # Constantes et config
└── styles/             # Styles partagés
```

## 🔍 Fonctionnalités avancées

### Batch operations

```tsx
// Pour des modifications multiples performantes
EqualiserService.beginBatch();
bands.forEach(band => {
  EqualiserService.setBandGain(band.id, calculateGain(band));
});
EqualiserService.endBatch();
```

### Analyse audio

```tsx
// Démarrer l'analyse du spectre
await EqualiserService.startSpectrumAnalysis(50); // 50ms d'intervalle

// Écouter les données
EqualiserService.on('spectrumData', (data) => {
  console.log('Magnitudes:', data.magnitudes);
  console.log('Peaks:', data.peaks);
});
```

## 📄 Licence

MIT
