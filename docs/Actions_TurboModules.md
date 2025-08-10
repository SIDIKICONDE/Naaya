## Plan d’actions TurboModules

### Contexte
- Problème détecté: désalignement du codegen iOS par rapport aux specs TypeScript.
  - La méthode `setFilterWithParams` existe dans `specs/NativeCameraFiltersModule.ts` mais n’est pas présente dans l’artefact iOS généré (`ios/Naaya/Naaya.h`).
  - Aucune spec iOS générée visible pour `NativeAudioEqualizerModule`, alors que la spec TS et le module C++ existent.
- Les modules C++ `NativeCameraModule` et `NativeCameraFiltersModule` héritent de CxxSpec codegen; ces headers sont générés par RN codegen et ne doivent pas être committés.

### Prérequis
- Node >= 18, Yarn/NPM
- iOS: Xcode + CocoaPods, Ruby bundler si utilisé
- Android: JDK 17, Android SDK, NDK (version définie par RN 0.80)

### 1) Régénérer le codegen et réaligner iOS
- À la racine du projet:
```bash
npx react-native codegen
```
- iOS: régénérer les pods (ce qui reconstruit les artefacts codegen ObjC++):
```bash
cd ios
pod install --repo-update
```
- Clean complet pour éviter les artefacts obsolètes:
```bash
# Android
cd android
./gradlew clean
rm -rf app/build

# iOS (option rapide)
rm -rf ~/Library/Developer/Xcode/DerivedData
```
- Rebuild rapide:
```bash
# depuis la racine
yarn android | cat
yarn ios | cat
```

### 2) Éviter les désynchronisations d’artefacts iOS
- Ne pas committer les fichiers codegen iOS (ex: `ios/Naaya/Naaya.h`).
- Ajouter au `.gitignore` si nécessaire:
```gitignore
# Artefacts iOS générés par react-native-codegen
ios/Naaya/Naaya.h
```

- Si le fichier a déjà été committé, retire-le de l’index Git puis commite la suppression (le fichier restera localement):
```bash
git rm --cached ios/Naaya/Naaya.h
git commit -m "chore(codegen): remove generated Naaya.h from VCS"
```

### 3) Vérifications après régénération
- iOS:
  - Ouvrir `ios/Naaya/Naaya.h` généré et vérifier:
    - La présence des signatures de `NativeCameraFiltersModule`, incluant `setFilterWithParams(name:intensity:params:)` si exposée par la spec.
    - La présence d’un protocole/spec pour `NativeAudioEqualizerModule`.
  - Vérifier les providers sont bien mappés (fichier `ios/Naaya/RCTModuleProviders.mm`):
    - `NativeCameraModule` → `NativeCameraModuleProvider`
    - `NativeCameraFiltersModule` → `NativeCameraFiltersModuleProvider`
    - `NativeAudioEqualizerModule` → `NativeAudioEqualizerModuleProvider`
- Android:
  - Le fichier `android/app/src/main/jni/CMakeLists.txt` référence bien les sources C++ des 3 modules.
  - Les `.so` FFmpeg attendus sont présents dans `android/app/src/main/jni/jniLibs/<ABI>/` (si utilisés). Si des erreurs de chargement surviennent, ajouter des `abiFilters` adaptés.
  - Exemple d’`abiFilters` côté Gradle si vous ne livrez que certaines ABI:
```gradle
android {
  defaultConfig {
    ndk {
      abiFilters 'arm64-v8a', 'x86_64' // ajuster selon les jniLibs disponibles
    }
  }
}
```

### 3-bis) Podfile et New Architecture (iOS)
- Exemple minimal de `Podfile` compatible RN 0.80 (extrait):
```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '14.0'

target 'Naaya' do
  config = use_native_modules!

  flags = get_default_flags()

  use_react_native!(
    :path => config["reactNativePath"],
    :new_arch_enabled => flags[:new_arch_enabled],
    :hermes_enabled => true,
    :fabric_enabled => flags[:fabric_enabled]
  )
end
```
- Pour activer/désactiver la New Architecture, utilisez la variable d’environnement `RCT_NEW_ARCH_ENABLED`:
```bash
# Activer
export RCT_NEW_ARCH_ENABLED=1
# Désactiver
unset RCT_NEW_ARCH_ENABLED
```
- Après un changement de New Architecture, nettoyez et réinstallez les pods:
```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### 4) Guards et diagnostics runtime (JS)
- Vérifier la disponibilité des TurboModules au boot:
```js
import { TurboModuleRegistry } from 'react-native';
['NativeCameraModule','NativeCameraFiltersModule','NativeAudioEqualizerModule'].forEach(name => {
  const m = TurboModuleRegistry.get(name);
  console.log('TurboModule', name, !!m);
});
```
- Entourer les appels critiques de guards et pister les erreurs pour éviter les crashs si un module est indisponible en dev.

### 5) Tests (Jest)
- Ajouter un mock de `TurboModuleRegistry` pour les tests unitaires:
```js
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(() => ({})),
  get: jest.fn(() => ({})),
}));
```
- Assurez-vous que `jest.setup.js` est bien chargé via `jest.config.js`:
```js
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
};
```
- Supprimer les `// @ts-ignore` côté JS/TS si la spec expose déjà la méthode (ex: `getRecordingProgress`) afin de laisser TypeScript assurer la cohérence.

### 6) Intégration CI/CD (recommandé)
- Ajouter un job CI qui échoue si `npx react-native codegen` produit un diff:
```bash
npx react-native codegen
if ! git diff --quiet; then
  echo "[CI] Codegen a produit des modifications. Validez les specs et regénérez." >&2
  exit 1
fi
```
- Scripts package.json (optionnel):
```json
{
  "scripts": {
    "codegen": "react-native codegen",
    "native:clean": "cd android && ./gradlew clean && rm -rf app/build && cd ../.. && rm -rf ~/Library/Developer/Xcode/DerivedData",
    "native:setup": "yarn codegen && cd ios && pod install --repo-update && cd .."
  }
}
```

### 7) Dépannage courant
- `Undefined is not a function` lors d’un appel TS/JS:
  - Le codegen iOS n’est pas à jour ou la méthode n’est pas exposée en C++/ObjC. Regénérer et vérifier les signatures.
- `symbol not found`/`dlopen` côté Android:
  - ABI manquante ou `.so` FFmpeg introuvable. Vérifier `jniLibs` et la config Gradle (`abiFilters`).
- Crash durant l’initialisation JSI sur iOS:
  - Headers codegen C++ non trouvés; s’assurer que Pods génère et exporte bien les headers utilisés par `shared/*.h`.

### 8) Checklist rapide
- [ ] `npx react-native codegen`
- [ ] `cd ios && pod install --repo-update`
- [ ] Clean: `./gradlew clean` (Android) et DerivedData (iOS)
- [ ] Vérifier `Naaya.h` contient les méthodes attendues (filtres + égaliseur)
- [ ] Build `yarn android` et `yarn ios`
- [ ] Vérifier logs de présence des modules au runtime
- [ ] (Tests) Mock `TurboModuleRegistry` et enlever `ts-ignore` superflus
- [ ] (CI) Ajouter un step de vérification codegen

### 9) Corrections de code TypeScript (exemples rapides)
- Remplacer les `// @ts-ignore` par des imports typés depuis les specs:
```ts
// Exemple: utiliser l’API typée du module caméra
import NativeCameraModule from '../specs/NativeCameraModule';

export async function getRecordingProgress() {
  return NativeCameraModule.getRecordingProgress();
}
```

- Ajouter un guard runtime autour des TurboModules pour éviter les crashs en dev:
```ts
import { TurboModuleRegistry } from 'react-native';

const filters = TurboModuleRegistry.get('NativeCameraFiltersModule');
if (!filters) {
  console.warn('NativeCameraFiltersModule indisponible (dev)');
} else {
  // safe to use
}
```
