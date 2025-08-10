# Guide d'Intégration FFmpeg iOS pour Naaya

## 🎯 Objectif
Unifier le pipeline de filtres en utilisant FFmpeg comme moteur unique sur iOS et Android, éliminant la dépendance à Core Image.

## ✅ Modifications Implémentées

### 1. API C++ Unifiée
- ✅ **Ajout de `NaayaFilters_ProcessBGRA()`** dans `shared/NativeCameraFiltersModule.cpp`
- ✅ Interface C propre pour l'accès depuis Objective-C
- ✅ Définition `FFMPEG_AVAILABLE` pour iOS dans le header

### 2. Pipeline iOS Modifié
- ✅ **Preview** (`NaayaPreviewView.mm`) : FFmpeg en priorité, Core Image en fallback
- ✅ **Enregistrement** (`VideoCaptureIOS.mm`) : Traitement FFmpeg des frames avant encodage
- ✅ Gestion propre des buffers CVPixelBuffer

### 3. Configuration du Projet
- ✅ **Podfile mis à jour** : Ajout de `ffmpeg-kit-ios-full`
- ✅ Script d'installation automatisé (`scripts/setup-ffmpeg-ios.sh`)

## 🚀 Installation

### Étape 1 : Installer FFmpeg-kit
```bash
cd ios
pod install
```

### Étape 2 : Ou utiliser le script automatisé
```bash
./scripts/setup-ffmpeg-ios.sh
```

### Étape 3 : Vérification
```bash
cd ios && xcodebuild -workspace Naaya.xcworkspace -scheme Naaya -configuration Debug -sdk iphonesimulator build
```

## 🔄 Architecture du Pipeline

### Flux de Traitement Unifié
```
JS Filter Request
      ↓
NativeCameraFiltersModule (C++)
      ↓
FFmpegFilterProcessor
      ↓
iOS: NaayaFilters_ProcessBGRA() ← Nouveau !
     ↓
Preview & Recording (Objective-C)
```

### Avant vs Après
| Aspect | Avant | Après |
|--------|-------|-------|
| **Preview iOS** | Core Image uniquement | FFmpeg → Core Image (fallback) |
| **Recording iOS** | Core Image uniquement | FFmpeg → Core Image (fallback) |
| **Android** | FFmpeg uniquement | FFmpeg uniquement (inchangé) |
| **Consistance** | ❌ Deux moteurs différents | ✅ FFmpeg partout |

## 🧪 Tests Requis

### 1. Test de Compilation
```bash
# iOS
cd ios && xcodebuild -workspace Naaya.xcworkspace -scheme Naaya build

# Android
cd android && ./gradlew assembleDebug
```

### 2. Test Fonctionnel
1. **Preview** : Vérifier que les filtres s'appliquent en temps réel
2. **Recording** : Enregistrer une vidéo et vérifier les filtres
3. **Fallback** : Désactiver FFmpeg et vérifier Core Image
4. **Performance** : Mesurer les FPS avec/sans filtres

### 3. Validation Pipeline
```javascript
// Test depuis React Native
const filters = [
  { type: 'brightness', value: 0.3 },
  { type: 'contrast', value: 1.2 },
  { type: 'saturation', value: 1.1 }
];

NativeCameraFiltersModule.setAdvancedFilter('brightness', 0.3, {});
// Doit utiliser FFmpeg sur iOS maintenant
```

## 📋 TODO Restants

- [ ] Tester la compilation iOS avec ffmpeg-kit
- [ ] Valider les performances FFmpeg vs Core Image
- [ ] Ajouter la gestion d'erreurs FFmpeg côté C++
- [ ] Optimiser les conversions de formats de buffers
- [ ] Mesurer l'impact sur la taille de l'app

## 🔧 Dépannage

### Erreur de Compilation iOS
```bash
# Nettoyer le build
cd ios
rm -rf Pods/ Podfile.lock
pod install
```

### FFmpeg Non Trouvé
```bash
# Vérifier l'installation de ffmpeg-kit
cd ios && pod list | grep ffmpeg
```

### Performance Dégradée
- Vérifier que `FFMPEG_AVAILABLE` est bien défini
- Profiler avec Instruments (Time Profiler)
- Comparer avant/après avec les métriques de frame rate

## 🎉 Résultat Final

Une fois cette intégration terminée :
- ✅ **Moteur unique** : FFmpeg partout (iOS + Android)
- ✅ **Consistance** : Même rendu de filtres sur toutes plateformes
- ✅ **Fallback robuste** : Core Image si FFmpeg indisponible
- ✅ **Performance** : Pipeline optimisé pour le temps réel
