# Makefile Naaya - Génération d'IPA iOS

.PHONY: ipa ipa-dev ipa-adhoc ipa-appstore prebuild archive export export-plist show open-builds pods clean-ios

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

prebuild:
	yarn install --frozen-lockfile
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


