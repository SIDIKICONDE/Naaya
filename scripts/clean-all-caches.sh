#!/bin/bash

# Script de nettoyage complet des caches pour React Native/Expo
# Usage: ./scripts/clean-all-caches.sh

echo "🧹 Début du nettoyage complet des caches..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages avec couleur
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Nettoyage des caches Node.js et Yarn
print_status "Nettoyage des caches Node.js et Yarn..."
rm -rf node_modules
rm -rf .yarn/cache
rm -rf .yarn/install-state.gz
yarn cache clean 2>/dev/null || npm cache clean --force 2>/dev/null
print_success "Caches Node.js et Yarn nettoyés"

# 2. Nettoyage des caches React Native
print_status "Nettoyage des caches React Native..."
rm -rf .bundle
rm -rf build
rm -rf builds
rm -rf .metro.log
rm -rf .watchmanconfig
watchman watch-del-all 2>/dev/null || print_warning "Watchman non installé ou non accessible"

# 3. Nettoyage des caches Metro
print_status "Nettoyage des caches Metro..."
npx react-native start --reset-cache 2>/dev/null || print_warning "Metro non accessible"
rm -rf $TMPDIR/metro-* 2>/dev/null || print_warning "Cache Metro temporaire non trouvé"
rm -rf $TMPDIR/react-* 2>/dev/null || print_warning "Cache React temporaire non trouvé"

# 4. Nettoyage des caches iOS
print_status "Nettoyage des caches iOS..."
cd ios
rm -rf build
rm -rf DerivedData
rm -rf Pods
rm -rf Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData 2>/dev/null || print_warning "Cache Xcode non accessible"
cd ..

# 5. Nettoyage des caches Android
print_status "Nettoyage des caches Android..."
cd android
./gradlew clean 2>/dev/null || print_warning "Gradle non accessible"
rm -rf .gradle
rm -rf build
rm -rf app/build
cd ..

# 6. Nettoyage des caches Expo
print_status "Nettoyage des caches Expo..."
npx expo install --fix 2>/dev/null || print_warning "Expo CLI non accessible"
rm -rf .expo 2>/dev/null || print_warning "Dossier .expo non trouvé"

# 7. Nettoyage des caches Jest
print_status "Nettoyage des caches Jest..."
rm -rf coverage
rm -rf .jest

# 8. Nettoyage des caches TypeScript
print_status "Nettoyage des caches TypeScript..."
rm -rf tsconfig.tsbuildinfo 2>/dev/null || print_warning "Cache TypeScript non trouvé"

# 9. Nettoyage des caches Babel
print_status "Nettoyage des caches Babel..."
rm -rf .babel-cache 2>/dev/null || print_warning "Cache Babel non trouvé"

# 10. Nettoyage des caches ESLint et Prettier
print_status "Nettoyage des caches ESLint et Prettier..."
rm -rf .eslintcache 2>/dev/null || print_warning "Cache ESLint non trouvé"

# 11. Nettoyage des fichiers temporaires système
print_status "Nettoyage des fichiers temporaires..."
rm -rf .DS_Store
find . -name ".DS_Store" -delete 2>/dev/null || print_warning "Fichiers .DS_Store non trouvés"
find . -name "*.log" -delete 2>/dev/null || print_warning "Fichiers .log non trouvés"

# 12. Réinstallation des dépendances
print_status "Réinstallation des dépendances..."
if [ -f "yarn.lock" ]; then
    yarn install
    print_success "Dépendances réinstallées avec Yarn"
elif [ -f "package-lock.json" ]; then
    npm install
    print_success "Dépendances réinstallées avec npm"
else
    print_warning "Aucun fichier de lock trouvé, installation avec npm"
    npm install
fi

# 13. Réinstallation des pods iOS
print_status "Réinstallation des pods iOS..."
cd ios
pod install 2>/dev/null || print_warning "CocoaPods non accessible ou erreur d'installation"
cd ..

echo ""
print_success "🧹 Nettoyage complet terminé !"
echo ""
echo "📋 Actions effectuées :"
echo "  ✅ Caches Node.js et Yarn supprimés"
echo "  ✅ Caches React Native nettoyés"
echo "  ✅ Caches Metro supprimés"
echo "  ✅ Caches iOS nettoyés"
echo "  ✅ Caches Android nettoyés"
echo "  ✅ Caches Expo supprimés"
echo "  ✅ Caches Jest nettoyés"
echo "  ✅ Caches TypeScript supprimés"
echo "  ✅ Caches Babel nettoyés"
echo "  ✅ Caches ESLint/Prettier supprimés"
echo "  ✅ Fichiers temporaires nettoyés"
echo "  ✅ Dépendances réinstallées"
echo "  ✅ Pods iOS réinstallés"
echo ""
echo "🚀 Votre projet est maintenant propre et prêt à être utilisé !"
