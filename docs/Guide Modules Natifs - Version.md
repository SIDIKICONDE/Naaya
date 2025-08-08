# Module Turbo Natif C++ Pur - Guide Complet

> Créez un module C++ partagé entre Android et iOS sans code spécifique à la plateforme.

## 📋 Structure du projet

```
project/
├── specs/
│   └── NativeSampleModule.ts
├── shared/
│   ├── NativeSampleModule.h
│   └── NativeSampleModule.cpp
├── android/
│   └── app/
│       ├── build.gradle
│       └── src/main/jni/
│           ├── CMakeLists.txt
│           └── OnLoad.cpp
└── ios/
    ├── NativeSampleModuleProvider.h
    ├── NativeSampleModuleProvider.mm
```

## 1️⃣ Spécifications JavaScript

**`specs/NativeSampleModule.ts`**



## 2️⃣ Implémentation C++

### Header partagé

**`shared/NativeSampleModule.h`**

```cpp
#pragma once

#include <AppSpecsJSI.h>
#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>

namespace facebook::react {



### Implémentation partagée

**`shared/NativeSampleModule.cpp`**

```cpp
#include "NativeSampleModule.h"
#include <algorithm>
#include <sstream>

namespace facebook::react {



} // namespace facebook::react
```

**Bonnes pratiques :**
- Code C++ pur sans dépendances plateforme
- Gestion d'erreurs avec try/catch si nécessaire
- Utilisez `jsi::Runtime&` pour les interactions avec JavaScript

## 3️⃣ Configuration Android

### CMakeLists.txt

**`android/app/src/main/jni/CMakeLists.txt`**

```cmake
cmake_minimum_required(VERSION 3.13)
project(appmodules)

# Configuration React Native
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Inclusion des sources partagées
set(SHARED_SRC_DIR "../../../../../shared")

target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    ${SHARED_SRC_DIR}/NativeSampleModule.cpp
)

target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC
    ${SHARED_SRC_DIR}
)

# Liaison avec les bibliothèques React Native
target_link_libraries(${CMAKE_PROJECT_NAME}
    # Bibliothèques système si nécessaires
    log
)
```

### Configuration Gradle

**`android/app/build.gradle`**

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        // ...
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++17"
                arguments "-DANDROID_STL=c++_shared"
            }
        }
    }
    
    externalNativeBuild {
        cmake {
            path "src/main/jni/CMakeLists.txt"
            version "3.22.1"
        }
    }
}
```

### Enregistrement Android

**`android/app/src/main/jni/OnLoad.cpp`**

```cpp
#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <NativeSampleModule.h>

std::shared_ptr<facebook::react::TurboModule> cxxModuleProvider(
    const std::string& name,
    const std::shared_ptr<facebook::react::CallInvoker>& jsInvoker) {
    
    if (name == facebook::react::NativeSampleModule::kModuleName) {
        return std::make_shared<facebook::react::NativeSampleModule>(jsInvoker);
    }
    
    // Fallback vers l'autolinking
    return facebook::react::autolinking_cxxModuleProvider(name, jsInvoker);
}
```

## 4️⃣ Configuration iOS Complète

### Provider Header

**`ios/NativeSampleModuleProvider.h`**

```objc
#import <Foundation/Foundation.h>
#import <ReactCommon/RCTTurboModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface NativeSampleModuleProvider : NSObject <RCTTurboModuleProvider>
@end

NS_ASSUME_NONNULL_END
```

### Provider Implémentation

**`ios/NativeSampleModuleProvider.mm`**

```objc
#import "NativeSampleModuleProvider.h"
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>

// Import du header C++
#import "NativeSampleModule.h"

using namespace facebook::react;

@implementation NativeSampleModuleProvider

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params {
    return std::make_shared<NativeSampleModule>(params.jsInvoker);
}

@end
```

### Configuration Xcode COMPLÈTE

#### Étape 1 : Ajouter les fichiers au projet

1. **Ouvrir Xcode** : `open ios/SampleApp.xcworkspace`

2. **Ajouter le dossier shared** :
   - Clic droit sur le projet dans le navigateur
   - "Add Files to SampleApp"
   - Sélectionner le dossier `shared/`
   - ✅ Cocher "Create groups"
   - ✅ Cocher "Add to target: SampleApp"

3. **Ajouter les providers** :
   - Répéter pour `NativeSampleModuleProvider.h` et `.mm`

#### Étape 2 : Configuration Build Settings

1. **Header Search Paths** :
   ```
   $(SRCROOT)/../shared
   $(SRCROOT)/../node_modules/react-native/ReactCommon
   $(SRCROOT)/../node_modules/react-native/React
   ```

2. **Library Search Paths** :
   ```
   $(SRCROOT)/../node_modules/react-native/ReactCommon
   ```

3. **Other C++ Flags** :
   ```
   -std=c++17
   -DFOLLY_NO_CONFIG
   -DFOLLY_MOBILE=1
   ```



#### Étape 4 : Vérification .pbxproj

Le fichier `ios/xcodeproj/project.pbxproj` doit contenir les références à vos fichiers. Si Xcode ne les ajoute pas automatiquement :

1. **Fermer Xcode**
2. **Éditer manuellement** le `.pbxproj` (optionnel, généralement Xcode le fait)
3. **Rouvrir et clean build**

## 📦 Configuration package.json

```json
{
  "name": "SampleApp",
  "codegenConfig": {
    "name": "AppSpecs",
    "type": "modules",
    "jsSrcsDir": "specs",
    "android": {
      "javaPackageName": "com.sampleapp.specs"
    },
    "ios": {
      "modulesProvider": {
        "NativeSampleModule": "NativeSampleModuleProvider"
      }
    }
  }
}
```

## 🚀 Build et Test

### Android
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### iOS
```bash
cd ios
rm -rf Pods/ Podfile.lock
bundle install
bundle exec pod install
```


### Test JavaScript

```javascript
import NativeSampleModule from './specs/NativeSampleModule';

// Utilisation
const result = NativeSampleModule.reverseString("Hello");
console.log(result); // "olleH"

const sum = NativeSampleModule.addNumbers(5, 3);
console.log(sum); // 8
```

## 🐛 Dépannage courant

### Erreurs Android
- **CMake introuvable** : Installer CMake via Android Studio SDK Manager
- **Headers manquants** : Vérifier les chemins dans CMakeLists.txt
- **Symboles non définis** : S'assurer que OnLoad.cpp enregistre le module

### Erreurs iOS
- **Header not found** : Vérifier Header Search Paths dans Build Settings
- **Symboles dupliqués** : S'assurer qu'un seul provider existe par module
- **Module non trouvé** : Vérifier l'enregistrement dans AppDelegate.mm

### Erreurs communes
- **Noms incohérents** : Le nom dans specs/, provider, et enregistrement doit être identique
- **Codegen manqué** : Relancer `npx react-native codegen` après modification des specs
- **Cache build** : Nettoyer complètement les builds Android et iOS

## ✅ Points de validation

Avant de considérer que votre module fonctionne :

1. ✅ **Codegen généré** : Vérifier que `AppSpecsJSI.h` existe
2. ✅ **Build Android** : Compilation sans erreur
3. ✅ **Build iOS** : Compilation sans erreur dans Xcode  
4. ✅ **Runtime test** : Module accessible depuis JavaScript
5. ✅ **Méthodes fonctionnelles** : Toutes les méthodes retournent les bonnes valeurs

## 🔧 Commandes utiles

```bash
# Régénérer le codegen
npx react-native codegen

# Clean builds
cd android && ./gradlew clean
cd ios && rm -rf build/ DerivedData/

# Reset metro cache
npx react-native start --reset-cache
```

Ce guide vous donne maintenant toutes les étapes nécessaires pour créer un module Turbo natif C++ fonctionnel sur les deux plateformes !