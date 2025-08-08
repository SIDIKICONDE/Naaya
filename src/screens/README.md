# Écran d'Enregistrement Vidéo - Naaya

## Vue d'ensemble

L'écran `RealCameraViewScreen` est l'interface principale pour l'enregistrement vidéo et la capture photo dans l'application Naaya. Il utilise le module caméra natif C++ pour des performances optimales.

## Fonctionnalités

### 📹 Enregistrement Vidéo
- **Bouton d'enregistrement central** : Appuyez pour démarrer/arrêter l'enregistrement
- **Durée maximale** : 60 secondes par vidéo
- **Indicateur visuel** : Timer et point rouge clignotant pendant l'enregistrement
- **Qualité haute** : Enregistrement en haute qualité avec audio

### 📷 Capture Photo
- **Bouton photo dédié** : Capture instantanée de photos haute qualité
- **Support du flash** : Compatible avec le mode flash activé

### 🔄 Contrôles Caméra
- **Changement de caméra** : Basculer entre caméra avant/arrière
- **Modes flash** : Off, On, Auto
- **Zoom** : Support du zoom natif (à implémenter dans l'UI)

### 🎨 Interface Utilisateur
- **Design moderne** : Interface épurée avec contrôles intuitifs
- **Animations fluides** : Transitions et feedbacks visuels
- **Mode plein écran** : Utilisation optimale de l'espace écran

## Configuration

### Permissions iOS (Info.plist)
✅ `NSCameraUsageDescription` - Accès à la caméra
✅ `NSMicrophoneUsageDescription` - Accès au microphone
✅ `NSPhotoLibraryUsageDescription` - Accès à la photothèque
✅ `NSPhotoLibraryAddUsageDescription` - Ajout à la photothèque

### Permissions Android (AndroidManifest.xml)
✅ `CAMERA` - Accès à la caméra
✅ `RECORD_AUDIO` - Enregistrement audio
✅ `WRITE_EXTERNAL_STORAGE` - Sauvegarde des médias
✅ `READ_EXTERNAL_STORAGE` - Lecture des médias
✅ `READ_MEDIA_IMAGES` - Accès aux images (Android 13+)
✅ `READ_MEDIA_VIDEO` - Accès aux vidéos (Android 13+)

## Architecture

### Composants Principaux
- **NativeCamera** : Composant React Native pour l'affichage de la caméra
- **NativeCameraModule** : Module Turbo natif C++ pour les performances
- **Hooks personnalisés** : `useNativeCamera`, `useNativeCameraCapture`

### État de l'Application
```typescript
type RecordingState = 'idle' | 'recording' | 'processing';
```

## Utilisation

```typescript
import { RealCameraViewScreen } from './src/screens/RealCameraViewScreen';

function App() {
  return <RealCameraViewScreen />;
}
```

## Améliorations Futures

1. **Galerie intégrée** : Visualisation des médias capturés
2. **Filtres en temps réel** : Effets visuels pendant l'enregistrement
3. **Partage social** : Intégration avec les réseaux sociaux
4. **Édition vidéo** : Outils de montage basiques
5. **Modes de capture** : Time-lapse, slow-motion, etc.

## Performance

Le module utilise un moteur C++ natif pour :
- ⚡ Latence minimale
- 🔋 Consommation batterie optimisée
- 📊 Gestion mémoire efficace
- 🎯 Accès direct aux APIs système

## Dépannage

### La caméra ne démarre pas
1. Vérifier les permissions dans les paramètres
2. Redémarrer l'application
3. Vérifier la disponibilité de la caméra

### Problèmes d'enregistrement
1. Vérifier l'espace de stockage disponible
2. S'assurer que le microphone n'est pas utilisé par une autre app
3. Vérifier les permissions audio

## Support

Pour toute question ou problème, consultez la documentation du projet Naaya.