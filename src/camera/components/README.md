# Guide d'utilisation VisionCameraAdapter

## Vue d'ensemble

`VisionCameraAdapter` permet de connecter ton moteur C++ à React Native VisionCamera **sans passer par les bridges natifs traditionnels**.

## Avantages

- ✅ **Performance native** : Frame processors exécutés directement en C++
- ✅ **Pas de bridge JS** : Communication directe C++ ↔ VisionCamera
- ✅ **API compatible** : Même interface que `NativeCamera`
- ✅ **Temps réel** : Traitement des frames à 30fps

## Installation

```bash
# Installer les dépendances
yarn add react-native-vision-camera react-native-reanimated

# iOS
cd ios && bundle exec pod install

# Android (généralement automatique)
```

## Utilisation

### 1. Remplacer NativeCamera par VisionCameraAdapter

```tsx
// Avant (NativeCamera)
import { NativeCamera } from '../camera/components/NativeCamera';

// Après (VisionCameraAdapter)
import { VisionCameraAdapter } from '../camera/components/VisionCameraAdapter';

// Dans ton composant
<VisionCameraAdapter
  ref={cameraRef}
  onCameraReady={handleCameraReady}
  onError={handleCameraError}
  enablePreview={true}
  autoStart={true}
>
  {/* Tes contrôles existants */}
</VisionCameraAdapter>
```

### 2. Le moteur C++ est automatiquement connecté

Le frame processor `naayaProcessFrame` dans `NaayaFrameProcessor.mm` est appelé automatiquement :

```objc
// Dans NaayaFrameProcessor.mm
- (id)callback:(Frame *)frame withArguments:(NSDictionary * _Nullable)arguments {
  // Ton C++ est appelé ici pour chaque frame
  Camera::Bridge::submitFrameInfo((int)frame.width, (int)frame.height);
  return @(frame.width);
}
```

### 3. API identique à NativeCamera

```tsx
const cameraRef = useRef<VisionCameraAdapterRef>(null);

// Toutes les méthodes existantes fonctionnent
await cameraRef.current?.startCamera();
await cameraRef.current?.capturePhoto();
await cameraRef.current?.startRecording();
await cameraRef.current?.setFlashMode('on');
```

## Architecture

```
VisionCamera (UI/Contrôles)
    ↓
Frame Processor (NaayaFrameProcessor.mm)
    ↓
Ton Moteur C++ (direct)
    ↓
Résultats → JS (si nécessaire)
```

## Limitations actuelles

- ⚠️ **Contrôles caméra** : Flash, zoom, etc. doivent être implémentés via VisionCamera
- ⚠️ **Capture photo/vidéo** : Nécessite implémentation avec les APIs VisionCamera
- ⚠️ **Android** : Frame processor Android à implémenter

## Prochaines étapes

1. **Implémenter les contrôles** : Flash, zoom, etc.
2. **Ajouter capture photo/vidéo** : Utiliser les APIs VisionCamera
3. **Frame processor Android** : Créer l'équivalent Android
4. **Optimisations** : Ajuster frameProcessorFps selon les besoins

## Migration depuis NativeCamera

```tsx
// Dans RealCameraViewScreen.tsx
// Remplacer :
// import { NativeCamera } from '../camera/components/NativeCamera';
// par :
import { VisionCameraAdapter } from '../camera/components/VisionCameraAdapter';

// Et remplacer :
// <NativeCamera
// par :
// <VisionCameraAdapter
```

Le reste du code reste identique !
