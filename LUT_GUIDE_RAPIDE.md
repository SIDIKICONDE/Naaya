# Guide Rapide - Utilisation des LUTs dans Naaya

## Interface Utilisateur

L'option LUT est maintenant disponible dans le menu de filtres de votre app Naaya.

### Comment accéder aux LUTs :

1. **Ouvrir l'app caméra** Naaya
2. **Toucher le bouton "⋯"** (trois points) pour ouvrir le menu
3. **Sélectionner "Filtres"** dans le menu
4. **Dans la grille des filtres, chercher l'option "LUT"** avec l'icône 🎨
5. **Toucher "LUT"** pour ouvrir le modal de sélection

### Modal de Sélection LUT :

Quand vous touchez "LUT", un modal s'ouvre avec :

- **Champ de saisie** : Pour entrer le chemin absolu vers votre fichier .cube
- **Bouton "Parcourir…"** : Pour sélectionner un fichier via l'interface système
- **Sélecteur d'interpolation** : Nearest ou Trilinear (par défaut)
- **Bouton "Appliquer"** : Pour activer la LUT
- **Bouton "Annuler"** : Pour fermer sans appliquer

### Utilisation :

#### Option 1 - Saisie manuelle :
```
/Users/m1/Desktop/yana/Naaya/test_lut.cube
```

#### Option 2 - Parcourir :
- Toucher "Parcourir…"
- Sélectionner votre fichier .cube
- Le chemin se remplit automatiquement

#### Option 3 - Fichier de test :
Utilisez le fichier de test créé : `/Users/m1/Desktop/yana/Naaya/test_lut.cube`

### Désactiver la LUT :

Pour désactiver la LUT active :
1. Retourner dans le menu Filtres
2. Sélectionner "Off" (🔘)

### Formats supportés :

- **Format principal** : .cube (DaVinci Resolve, Adobe, etc.)
- **Taille LUT** : 8x8x8, 16x16x16, 32x32x32, 64x64x64
- **Interpolation** : Nearest (plus rapide) ou Trilinear (plus smooth)

### Moteurs utilisés :

- **Aperçu temps réel (iOS)** : CoreImage CIColorCube
- **Enregistrement/traitement** : FFmpeg lut3d filter
- **Paramètres** : Encodés dans le nom du filtre (ex: lut3d:/path.cube?interp=trilinear)

### Dépannage :

**Si le modal ne s'ouvre pas :**
- Vérifiez que l'option "LUT" apparaît dans la grille de filtres
- Vérifiez la console de débogage pour des erreurs

**Si la LUT ne s'applique pas :**
- Vérifiez que le chemin du fichier est correct et absolu
- Vérifiez que le fichier .cube est bien formaté
- Testez d'abord avec le fichier de test fourni

**Chemin de test :**
```
/Users/m1/Desktop/yana/Naaya/test_lut.cube
```

### Fichiers LUT compatibles :

- DaVinci Resolve (.cube)
- Adobe Premiere Pro (.cube)  
- Final Cut Pro (.cube)
- Tout fichier .cube standard 3D LUT

La LUT s'applique en temps réel à l'aperçu caméra et sera incluse dans les enregistrements vidéo.
