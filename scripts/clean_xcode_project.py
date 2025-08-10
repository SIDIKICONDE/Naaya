#!/usr/bin/env python3
"""
Script pour nettoyer le projet Xcode Naaya en supprimant les références aux fichiers audio supprimés.
"""

import re
import os
import sys

def clean_xcode_project(project_path):
    """Nettoie le fichier project.pbxproj en supprimant les références aux fichiers audio supprimés."""
    
    pbxproj_path = os.path.join(project_path, "project.pbxproj")
    
    if not os.path.exists(pbxproj_path):
        print(f"❌ Fichier project.pbxproj non trouvé: {pbxproj_path}")
        return False
    
    print(f"🧹 Nettoyage du projet Xcode: {pbxproj_path}")
    
    # Lire le fichier
    with open(pbxproj_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Sauvegarder une copie
    backup_path = pbxproj_path + ".backup"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Sauvegarde créée: {backup_path}")
    
    # Fichiers audio à supprimer
    audio_files = [
        "SpectralNR.cpp",
        "RNNoiseSuppressor.cpp",
        "SpectralNR.h",
        "RNNoiseSuppressor.h"
    ]
    
    # Supprimer les références aux fichiers audio
    for audio_file in audio_files:
        # Pattern pour les références de fichiers dans le projet
        pattern = rf'[^"]*{re.escape(audio_file)}[^"]*;'
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
        print(f"🗑️  Supprimé les références à: {audio_file}")
    
    # Nettoyer les lignes vides multiples
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    # Écrire le fichier nettoyé
    with open(pbxproj_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Projet Xcode nettoyé avec succès!")
    print("📝 Références aux fichiers audio supprimées")
    
    return True

def main():
    """Fonction principale."""
    project_path = "ios/Naaya.xcodeproj"
    
    if not os.path.exists(project_path):
        print(f"❌ Dossier du projet non trouvé: {project_path}")
        sys.exit(1)
    
    if clean_xcode_project(project_path):
        print("🎉 Nettoyage terminé! Vous pouvez maintenant essayer de créer l'IPA.")
    else:
        print("❌ Échec du nettoyage.")
        sys.exit(1)

if __name__ == "__main__":
    main()
