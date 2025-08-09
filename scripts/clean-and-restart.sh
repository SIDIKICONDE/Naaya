#!/bin/bash

echo "🧹 Nettoyage du cache React Native..."

# Nettoyer le cache Metro
npx react-native start --reset-cache &
METRO_PID=$!

# Attendre que Metro démarre
sleep 5

# Nettoyer le cache iOS
cd ios
rm -rf build/
rm -rf Pods/
pod install
cd ..

# Nettoyer le cache Android
cd android
./gradlew clean
cd ..

echo "✅ Cache nettoyé ! Redémarrage de l'application..."

# Arrêter Metro
kill $METRO_PID

echo "🚀 Prêt pour le redémarrage !"
echo "Exécutez : npx react-native run-ios ou npx react-native run-android"
