#!/usr/bin/env python3
"""
Script pour créer un IPA à partir d'une archive Xcode
"""

import os
import sys
import shutil
import zipfile

def create_ipa_from_archive(archive_path, ipa_path, project_name):
    """Crée un IPA à partir d'une archive Xcode"""
    
    if not os.path.exists(archive_path):
        print(f"❌ Archive non trouvée: {archive_path}")
        return False
    
    app_path = os.path.join(archive_path, "Products", "Applications", f"{project_name}.app")
    temp_dir = "temp_Payload"
    
    if not os.path.exists(app_path):
        print(f"❌ Application non trouvée: {app_path}")
        return False
    
    try:
        # Nettoyer le dossier temporaire s'il existe
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        # Créer la structure Payload
        os.makedirs(os.path.join(temp_dir, "Payload"))
        
        print(f"📁 Copie de l'application...")
        shutil.copytree(app_path, os.path.join(temp_dir, "Payload", f"{project_name}.app"))
        
        # Créer l'IPA (fichier ZIP)
        print(f"📦 Création de l'IPA...")
        
        with zipfile.ZipFile(ipa_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
        
        # Nettoyer
        shutil.rmtree(temp_dir)
        
        # Afficher la taille
        size = os.path.getsize(ipa_path)
        size_mb = size / (1024 * 1024)
        print(f"✅ IPA créé: {ipa_path} ({size_mb:.2f} MB)")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'IPA: {e}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        return False

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 create_ipa.py <archive_path> <ipa_path> <project_name>")
        sys.exit(1)
    
    archive_path = sys.argv[1]
    ipa_path = sys.argv[2]
    project_name = sys.argv[3]
    
    # Créer le dossier de sortie s'il n'existe pas
    os.makedirs(os.path.dirname(ipa_path), exist_ok=True)
    
    # Créer l'IPA
    success = create_ipa_from_archive(archive_path, ipa_path, project_name)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
