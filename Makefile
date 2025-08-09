# Makefile pour l'application Naaya
# Usage: make ipa

.PHONY: ipa clean install-deps help

# Variables
PROJECT_NAME = Naaya
WORKSPACE_PATH = ios/$(PROJECT_NAME).xcworkspace
SCHEME_NAME = $(PROJECT_NAME)
ARCHIVE_PATH = ios/build/$(PROJECT_NAME).xcarchive
IPA_PATH = ios/build/$(PROJECT_NAME).ipa
EXPORT_OPTIONS_PATH = ios/ExportOptions.plist

# Commande principale pour créer l'IPA
ipa: clean install-deps build-archive create-ipa

# Nettoyer les anciens builds
clean:
	@echo "🧹 Nettoyage des anciens builds..."
	@rm -rf ios/build
	@mkdir -p ios/build

# Installer les dépendances
install-deps:
	@echo "📦 Installation des dépendances..."
	@yarn install
	@cd ios && pod install

# Construire l'archive
build-archive:
	@echo "🔨 Construction de l'archive Xcode..."
	@xcodebuild archive \
		-workspace $(WORKSPACE_PATH) \
		-scheme $(SCHEME_NAME) \
		-configuration Debug \
		-archivePath $(ARCHIVE_PATH) \
		-destination "generic/platform=iOS" \
		-allowProvisioningUpdates \
		CODE_SIGN_STYLE=Automatic \
		DEVELOPMENT_TEAM=8GNN55S9HG

# Créer l'IPA à partir de l'archive
create-ipa:
	@echo "📦 Création de l'IPA..."
	@python3 scripts/create_ipa.py $(ARCHIVE_PATH) $(IPA_PATH) $(PROJECT_NAME)
	@echo ""
	@echo "🎉 IPA créé avec succès !"
	@echo "📍 Emplacement: $(IPA_PATH)"
	@ls -lh $(IPA_PATH) | awk '{print "📏 Taille: " $$5}'

# Aide
help:
	@echo "Commandes disponibles:"
	@echo "  make ipa          - Créer l'IPA complet (recommandé)"
	@echo "  make clean        - Nettoyer les builds"
	@echo "  make install-deps - Installer les dépendances"
	@echo "  make help         - Afficher cette aide"