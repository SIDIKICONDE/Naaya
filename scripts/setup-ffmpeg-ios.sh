#!/bin/bash

# Script d'intégration FFmpeg pour iOS
# Utilise ffmpeg-kit pour simplifier l'intégration

set -e

echo "🎬 Configuration FFmpeg pour iOS..."

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Répertoire de travail
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IOS_DIR="$PROJECT_ROOT/ios"

echo "📁 Répertoire du projet: $PROJECT_ROOT"

# Option 1: Utiliser ffmpeg-kit (recommandé pour React Native)
echo -e "${YELLOW}Installation de ffmpeg-kit-ios via CocoaPods...${NC}"

cd "$IOS_DIR"

# Vérifier si le Podfile existe
if [ ! -f "Podfile" ]; then
    echo -e "${RED}Erreur: Podfile non trouvé dans $IOS_DIR${NC}"
    exit 1
fi

# Sauvegarder le Podfile original
cp Podfile Podfile.backup

# Ajouter ffmpeg-kit au Podfile si pas déjà présent
if ! grep -q "ffmpeg-kit-ios" Podfile; then
    echo -e "${GREEN}Ajout de ffmpeg-kit-ios au Podfile...${NC}"
    
    # Insérer avant le "end" final du target
    sed -i '' "/^end$/i\\
  # FFmpeg pour le traitement vidéo\\
  pod 'ffmpeg-kit-ios-full', '~> 6.0'\\
" Podfile
else
    echo -e "${YELLOW}ffmpeg-kit-ios déjà présent dans le Podfile${NC}"
fi

# Installer les pods
echo -e "${GREEN}Installation des pods...${NC}"
pod install

# Créer un header bridge pour exposer FFmpeg
BRIDGE_HEADER="$IOS_DIR/Naaya/FFmpegBridge.h"
echo -e "${GREEN}Création du header bridge FFmpeg...${NC}"

cat > "$BRIDGE_HEADER" << 'EOF'
#pragma once

// Bridge header pour FFmpeg
// Active le support FFmpeg dans le code C++

#ifdef __cplusplus

// Définir FFMPEG_AVAILABLE pour activer le code FFmpeg
#ifndef FFMPEG_AVAILABLE
#define FFMPEG_AVAILABLE 1
#endif

// Headers FFmpeg (via ffmpeg-kit)
#if __has_include(<ffmpegkit/ffmpegkit.h>)
  // ffmpeg-kit wrapper (Objective-C)
  #define FFMPEG_KIT_AVAILABLE 1
#endif

// Pour l'accès direct aux libs FFmpeg (C)
#ifdef __cplusplus
extern "C" {
#endif

#if __has_include(<libavcodec/avcodec.h>)
  #include <libavcodec/avcodec.h>
  #include <libavfilter/avfilter.h>
  #include <libavformat/avformat.h>
  #include <libavutil/avutil.h>
  #include <libswscale/swscale.h>
  #include <libswresample/swresample.h>
#endif

#ifdef __cplusplus
}
#endif

#endif // __cplusplus
EOF

echo -e "${GREEN}Configuration Xcode...${NC}"

# Créer un script de configuration Xcode
XCODE_CONFIG="$IOS_DIR/configure-ffmpeg.rb"
cat > "$XCODE_CONFIG" << 'EOF'
#!/usr/bin/env ruby

require 'xcodeproj'

project_path = ARGV[0] || 'Naaya.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Trouver la target principale
target = project.targets.find { |t| t.name == 'Naaya' }

if target.nil?
  puts "❌ Target 'Naaya' non trouvée"
  exit 1
end

# Configurer les build settings pour FFmpeg
target.build_configurations.each do |config|
  # Définir FFMPEG_AVAILABLE
  config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
  unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FFMPEG_AVAILABLE=1')
    config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FFMPEG_AVAILABLE=1'
  end
  
  # Ajouter les header search paths pour FFmpeg
  config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
  ffmpeg_paths = [
    '$(SRCROOT)/../node_modules/ffmpeg-kit-react-native/ios/Frameworks/ffmpegkit.xcframework/ios-arm64/ffmpegkit.framework/Headers',
    '$(PODS_ROOT)/ffmpeg-kit-ios-full/ffmpegkit.xcframework/ios-arm64/ffmpegkit.framework/Headers'
  ]
  
  ffmpeg_paths.each do |path|
    unless config.build_settings['HEADER_SEARCH_PATHS'].include?(path)
      config.build_settings['HEADER_SEARCH_PATHS'] << path
    end
  end
  
  puts "✅ Configuration #{config.name}: FFMPEG_AVAILABLE=1 ajouté"
end

# Sauvegarder le projet
project.save

puts "✅ Projet Xcode configuré pour FFmpeg"
EOF

chmod +x "$XCODE_CONFIG"

cd "$IOS_DIR"
ruby "$XCODE_CONFIG"

# Nettoyer le build
echo -e "${GREEN}Nettoyage du build iOS...${NC}"
cd "$IOS_DIR"
if [ -d "build" ]; then
    rm -rf build
fi
if [ -d "~/Library/Developer/Xcode/DerivedData" ]; then
    rm -rf ~/Library/Developer/Xcode/DerivedData/Naaya-*
fi

echo -e "${GREEN}✅ FFmpeg intégré avec succès pour iOS!${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Ouvrir Xcode: open ios/Naaya.xcworkspace"
echo "2. Clean Build Folder (Cmd+Shift+K)"
echo "3. Build (Cmd+B)"
echo ""
echo "Le code FFmpeg est maintenant activé avec FFMPEG_AVAILABLE=1"
echo "Les filtres utiliseront FFmpeg au lieu de Core Image"
