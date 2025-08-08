/**
 * Utilitaires de diagnostic pour la caméra
 * Aide à identifier et résoudre les problèmes de caméra
 */

import { NativeCameraEngine } from '../index';
import type { CameraDevice, PermissionResult } from '../../../specs/NativeCameraModule';

export interface CameraDiagnosticResult {
  timestamp: string;
  platform: 'ios' | 'android';
  permissions: PermissionResult | null;
  devices: CameraDevice[];
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Effectue un diagnostic complet de la caméra
 */
export async function diagnoseCamera(): Promise<CameraDiagnosticResult> {
  const result: CameraDiagnosticResult = {
    timestamp: new Date().toISOString(),
    platform: 'ios', // TODO: Détecter la plateforme
    permissions: null,
    devices: [],
    errors: [],
    warnings: [],
    recommendations: [],
  };

  try {
    console.log('[CameraDiagnostic] Début du diagnostic...');

    // 1. Vérifier les permissions
    try {
      result.permissions = await NativeCameraEngine.checkPermissions();
      console.log('[CameraDiagnostic] Permissions:', result.permissions);
      
      if (result.permissions?.camera === 'denied') {
        result.errors.push('Permission caméra refusée');
        result.recommendations.push('Demander les permissions caméra');
      } else if (result.permissions?.camera === 'granted') {
        console.log('[CameraDiagnostic] Permission caméra accordée');
      }
    } catch (error) {
      result.errors.push(`Erreur vérification permissions: ${error}`);
    }

    // 2. Énumérer les dispositifs
    try {
      result.devices = await NativeCameraEngine.getAvailableDevices();
      console.log('[CameraDiagnostic] Dispositifs trouvés:', result.devices.length);
      
      if (result.devices.length === 0) {
        result.errors.push('Aucun dispositif caméra trouvé');
        result.recommendations.push('Vérifier que l\'appareil a une caméra');
        result.recommendations.push('Tester sur un appareil physique (pas simulateur)');
      } else {
        // Vérifier les types de dispositifs
        const backDevices = result.devices.filter(d => d.position === 'back');
        const frontDevices = result.devices.filter(d => d.position === 'front');
        
        if (backDevices.length === 0) {
          result.warnings.push('Aucune caméra arrière trouvée');
        }
        
        if (frontDevices.length === 0) {
          result.warnings.push('Aucune caméra avant trouvée');
        }
        
        console.log('[CameraDiagnostic] Dispositifs:', {
          total: result.devices.length,
          back: backDevices.length,
          front: frontDevices.length,
        });
      }
    } catch (error) {
      result.errors.push(`Erreur énumération dispositifs: ${error}`);
    }

    // 3. Tester le démarrage de la caméra (si permissions accordées)
    if (result.permissions?.camera === 'granted' && result.devices.length > 0) {
      try {
        const deviceId = result.devices[0].id;
        console.log('[CameraDiagnostic] Test démarrage caméra avec:', deviceId);
        
        const success = await NativeCameraEngine.startCamera(deviceId);
        if (success) {
          console.log('[CameraDiagnostic] Démarrage caméra réussi');
          
          // Arrêter la caméra après le test
          await NativeCameraEngine.stopCamera();
        } else {
          result.errors.push('Échec du démarrage de la caméra');
          result.recommendations.push('Redémarrer l\'application');
          result.recommendations.push('Vérifier l\'espace de stockage');
        }
      } catch (error) {
        result.errors.push(`Erreur test démarrage: ${error}`);
      }
    }

    // 4. Générer des recommandations basées sur les erreurs
    if (result.errors.length > 0) {
      result.recommendations.push('Exécuter le script de correction: ./scripts/fix-camera.sh');
      result.recommendations.push('Redémarrer l\'appareil');
      result.recommendations.push('Vérifier les paramètres de confidentialité');
    }

    if (result.warnings.length > 0) {
      result.recommendations.push('Tester sur un autre appareil');
    }

  } catch (error) {
    result.errors.push(`Erreur diagnostic général: ${error}`);
  }

  console.log('[CameraDiagnostic] Diagnostic terminé:', result);
  return result;
}

/**
 * Affiche un rapport de diagnostic formaté
 */
export function printDiagnosticReport(result: CameraDiagnosticResult): void {
  console.log('\n🔍 RAPPORT DIAGNOSTIC CAMÉRA');
  console.log('================================');
  console.log(`📅 Timestamp: ${result.timestamp}`);
  console.log(`📱 Plateforme: ${result.platform}`);
  
  console.log('\n📋 PERMISSIONS:');
  if (result.permissions) {
    console.log(`  Caméra: ${result.permissions.camera}`);
    console.log(`  Microphone: ${result.permissions.microphone}`);
  } else {
    console.log('  ❌ Permissions non disponibles');
  }
  
  console.log('\n📷 DISPOSITIFS:');
  if (result.devices.length > 0) {
    result.devices.forEach((device, index) => {
      console.log(`  ${index + 1}. ${device.name} (${device.position})`);
      console.log(`     ID: ${device.id}`);
      console.log(`     Flash: ${device.hasFlash ? 'Oui' : 'Non'}`);
    });
  } else {
    console.log('  ❌ Aucun dispositif trouvé');
  }
  
  if (result.errors.length > 0) {
    console.log('\n❌ ERREURS:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (result.recommendations.length > 0) {
    console.log('\n💡 RECOMMANDATIONS:');
    result.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  console.log('\n✅ Rapport terminé\n');
}

/**
 * Fonction utilitaire pour diagnostiquer et afficher le rapport
 */
export async function runCameraDiagnostic(): Promise<void> {
  try {
    const result = await diagnoseCamera();
    printDiagnosticReport(result);
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}
