# Makefile Naaya - Génération d'IPA iOS

.PHONY: help ipa ipa-dev ipa-adhoc ipa-appstore ipa-unsigned prebuild archive export export-plist show open-builds pods clean-ios clean-xcode clean-all-xcode clean-metro

help:
	@echo "🚀 Makefile Naaya - Génération d'IPA iOS"
	@echo ""
	@echo "Commandes principales:"
	@echo "  make ipa-signed      🎯 Génère un IPA signé fonctionnel"
	@echo "  make ipa-dev         📱 Génère un IPA de développement signé"
	@echo "  make ipa-adhoc       🔄 Génère un IPA Ad-Hoc signé"
	@echo "  make ipa-appstore    🏪 Génère un IPA App Store signé"
	@echo ""
	@echo "Commandes utilitaires:"
	@echo "  make pods            📦 Installe les dépendances CocoaPods"
	@echo "  make clean-ios       🧹 Nettoie les builds iOS"
	@echo "  make clean-metro     🧹 Nettoie Metro et les caches"
	@echo "  make open-builds     📂 Ouvre le dossier builds"
	@echo "  make ipa-guide       📖 Affiche le guide complet pour créer un IPA"
	@echo ""
	@echo "Variables disponibles:"
	@echo "  PROJECT_NAME=$(PROJECT_NAME)"
	@echo "  SCHEME=$(SCHEME)"
	@echo "  CONFIGURATION=$(CONFIGURATION)"
	@echo "  TEAM_ID=$(TEAM_ID)"

PROJECT_NAME ?= Naaya
SCHEME ?= Naaya
CONFIGURATION ?= Release
OUTPUT_DIR ?= builds
ARCHIVE_PATH := $(OUTPUT_DIR)/$(PROJECT_NAME).xcarchive
IPA_PATH := $(OUTPUT_DIR)/$(PROJECT_NAME).ipa
TEAM_ID ?= 8GNN55S9HG

# Méthodes possibles: debugging (ex-development), ad-hoc, app-store, enterprise
EXPORT_METHOD ?= debugging
EXPORT_PLIST := $(OUTPUT_DIR)/ExportOptions.plist

ipa: prebuild export-plist archive export show

ipa-dev: EXPORT_METHOD = debugging
ipa-dev: ipa

ipa-adhoc: EXPORT_METHOD = ad-hoc
ipa-adhoc: ipa

ipa-appstore: EXPORT_METHOD = app-store
ipa-appstore: ipa

ipa-signed: prebuild archive export show

prebuild:
	yarn install --immutable
	rm -rf $(OUTPUT_DIR)
	mkdir -p $(OUTPUT_DIR)
	cd ios && pod install

archive:
	xcodebuild clean \
		-workspace ios/$(PROJECT_NAME).xcworkspace \
		-scheme $(SCHEME) \
		-configuration $(CONFIGURATION) | cat
	xcodebuild archive \
		-workspace ios/$(PROJECT_NAME).xcworkspace \
		-scheme $(SCHEME) \
		-configuration $(CONFIGURATION) \
		-archivePath $(ARCHIVE_PATH) \
		-allowProvisioningUpdates \
		DEVELOPMENT_TEAM=$(TEAM_ID) \
		CODE_SIGN_STYLE=Automatic | cat

export-plist:
	@echo "Génération de $(EXPORT_PLIST) (method=$(EXPORT_METHOD))"
	@mkdir -p $(OUTPUT_DIR)
	@rm -f $(EXPORT_PLIST)
	@plutil -create xml1 $(EXPORT_PLIST)
	@plutil -insert method -string $(EXPORT_METHOD) $(EXPORT_PLIST)
	@plutil -insert signingStyle -string automatic $(EXPORT_PLIST)
	@plutil -insert teamID -string $(TEAM_ID) $(EXPORT_PLIST)
	@plutil -insert stripSwiftSymbols -bool YES $(EXPORT_PLIST)

export:
	xcodebuild -exportArchive \
		-archivePath $(ARCHIVE_PATH) \
		-exportPath $(OUTPUT_DIR) \
		-exportOptionsPlist $(EXPORT_PLIST) \
		-allowProvisioningUpdates | cat

show:
	@ls -lh $(OUTPUT_DIR) | cat
	@echo "IPA généré: $(IPA_PATH)"

open-builds:
	open $(OUTPUT_DIR)

pods:
	cd ios && pod install

clean-ios:
	rm -rf $(OUTPUT_DIR)
	cd ios && xcodebuild clean -workspace $(PROJECT_NAME).xcworkspace -scheme $(SCHEME) -configuration $(CONFIGURATION) | cat

clean-xcode:
	@echo "🧹 Nettoyage complet d'Xcode..."
	@echo "📁 Suppression des builds..."
	rm -rf $(OUTPUT_DIR)
	rm -rf ios/build
	rm -rf ios/DerivedData
	@echo "🗂️  Nettoyage des caches Xcode..."
	rm -rf ~/Library/Developer/Xcode/DerivedData
	rm -rf ~/Library/Caches/com.apple.dt.Xcode
	rm -rf ~/Library/Developer/Xcode/Archives
	@echo "📦 Nettoyage des Pods..."
	cd ios && rm -rf Pods
	cd ios && rm -rf Podfile.lock
	@echo "🔧 Réinstallation des Pods..."
	cd ios && pod install
	@echo "✅ Nettoyage Xcode terminé !"

clean-all-xcode:
	@echo "🧹 Nettoyage COMPLET de tous les projets Xcode..."
	@echo "📁 Suppression des builds locaux..."
	rm -rf $(OUTPUT_DIR)
	rm -rf ios/build
	rm -rf ios/DerivedData
	@echo "🗂️  Nettoyage des caches Xcode globaux..."
	rm -rf ~/Library/Developer/Xcode/DerivedData
	rm -rf ~/Library/Caches/com.apple.dt.Xcode
	rm -rf ~/Library/Developer/Xcode/Archives
	@echo "📋 Nettoyage des préférences et logs..."
	rm -rf ~/Library/Preferences/com.apple.dt.Xcode.plist
	rm -rf ~/Library/Preferences/com.apple.dt.Xcode*
	rm -rf ~/Library/Logs/Xcode
	@echo "🔧 Nettoyage des modules et frameworks..."
	rm -rf ~/Library/Developer/Xcode/UserData
	rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport
	rm -rf ~/Library/Developer/Xcode/watchOS\ DeviceSupport
	rm -rf ~/Library/Developer/Xcode/tvOS\ DeviceSupport
	@echo "📦 Nettoyage des Pods..."
	cd ios && rm -rf Pods
	cd ios && rm -rf Podfile.lock
	@echo "🔧 Réinstallation des Pods..."
	cd ios && pod install
	@echo "⚠️  Redémarrage d'Xcode recommandé après ce nettoyage"
	@echo "✅ Nettoyage COMPLET de tous les projets Xcode terminé !"

clean-metro:
	@echo "🧹 Nettoyage de Metro et des ports..."
	@echo "🛑 Arrêt de tous les processus Metro..."
	@-pkill -f "react-native" 2>/dev/null || true
	@-pkill -f "metro" 2>/dev/null || true
	@-pkill -f "npx" 2>/dev/null || true
	@echo "🗂️  Nettoyage du cache Metro..."
	@-npx react-native start --reset-cache 2>/dev/null || true
	@echo "🔌 Nettoyage des ports..."
	@-lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8083 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8084 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8085 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@echo "📦 Nettoyage des caches yarn..."
	@yarn cache clean
	@echo "🗑️  Suppression des dossiers node_modules et reinstallation..."
	@rm -rf node_modules
	@yarn install --immutable
	@echo "✅ Nettoyage Metro et ports terminé !"



ipa-guide:
	@echo "📖 Guide complet pour créer un IPA fonctionnel"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🎯 Configuration requise :"
	@echo "   • Compte Apple Developer (gratuit ou payant)"
	@echo "   • Bundle ID unique configuré"
	@echo "   • Certificat de signature valide"
	@echo ""
	@echo "1️⃣  Configuration dans Xcode :"
	@echo "   • Ouvrez: ios/$(PROJECT_NAME).xcworkspace"
	@echo "   • Sélectionnez le projet '$(PROJECT_NAME)'"
	@echo "   • Onglet 'Signing & Capabilities'"
	@echo "   • Cochez 'Automatically manage signing'"
	@echo "   • Sélectionnez votre équipe de développement"
	@echo ""
	@echo "2️⃣  Puis exécutez :"
	@echo "   make ipa-signed    (pour un IPA complet)"
	@echo "   make ipa-dev       (pour développement)"
	@echo "   make ipa-adhoc     (pour distribution ad-hoc)"
	@echo ""
	@echo "💡 Le processus automatique se chargera du reste !"
