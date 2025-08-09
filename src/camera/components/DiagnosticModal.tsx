import React, { useCallback, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import NativeCameraModule from '../../../specs/NativeCameraModule';
import { NativeCameraEngine } from '../index';

interface DiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ 
  visible, 
  onClose 
}) => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const testNativeModule = useCallback(async () => {
    addLog('🔍 Test du TurboModule natif...');
    
    try {
      // Test si le module existe
      if (!NativeCameraModule) {
        addLog('❌ NativeCameraModule est undefined');
        return;
      }
      addLog('✅ NativeCameraModule existe');

      // Test des méthodes individuelles
      const native: any = NativeCameraModule as any;
      
      // Test getAvailableDevices
      if (typeof native.getAvailableDevices === 'function') {
        addLog('✅ getAvailableDevices disponible');
        try {
          const devices = await native.getAvailableDevices();
          addLog(`📱 ${devices?.length || 0} dispositifs trouvés`);
        } catch (err) {
          addLog(`❌ getAvailableDevices erreur: ${err}`);
        }
      } else {
        addLog('❌ getAvailableDevices indisponible');
      }

      // Test setFlashMode
      if (typeof native.setFlashMode === 'function') {
        addLog('✅ setFlashMode disponible');
        try {
          const result = await native.setFlashMode('auto');
          addLog(`💡 setFlashMode('auto') résultat: ${result}`);
        } catch (err) {
          addLog(`❌ setFlashMode erreur: ${err}`);
        }
      } else {
        addLog('❌ setFlashMode indisponible');
      }

      // Test switchDevice  
      if (typeof native.switchDevice === 'function') {
        addLog('✅ switchDevice disponible');
        try {
          const result = await native.switchDevice('front');
          addLog(`🔄 switchDevice('front') résultat: ${result}`);
        } catch (err) {
          addLog(`❌ switchDevice erreur: ${err}`);
        }
      } else {
        addLog('❌ switchDevice indisponible');
      }

      // Test capturePhoto
      if (typeof native.capturePhoto === 'function') {
        addLog('✅ capturePhoto disponible');
      } else {
        addLog('❌ capturePhoto indisponible');
      }

      // Test startRecording
      if (typeof native.startRecording === 'function') {
        addLog('✅ startRecording disponible');
      } else {
        addLog('❌ startRecording indisponible');
      }

    } catch (error) {
      addLog(`❌ Erreur générale: ${error}`);
    }
  }, [addLog]);

  const testCameraEngine = useCallback(async () => {
    addLog('🔧 Test du CameraEngine wrapper...');
    
    try {
      // Test permissions
      const permissions = await NativeCameraEngine.checkPermissions();
      addLog(`🔐 Permissions: ${JSON.stringify(permissions)}`);

      // Test devices
      const devices = await NativeCameraEngine.getAvailableDevices();
      addLog(`📱 Devices: ${devices.length} trouvés`);

      // Test flash
      const hasFlash = await NativeCameraEngine.hasFlash();
      addLog(`💡 Flash disponible: ${hasFlash}`);

      // Test set flash
      const flashResult = await NativeCameraEngine.setFlashMode('auto');
      addLog(`💡 setFlashMode résultat: ${flashResult}`);

    } catch (error) {
      addLog(`❌ Erreur CameraEngine: ${error}`);
    }
  }, [addLog]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Diagnostic Caméra</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={testNativeModule} style={styles.testButton}>
            <Text style={styles.buttonText}>Test Module Natif</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={testCameraEngine} style={styles.testButton}>
            <Text style={styles.buttonText}>Test CameraEngine</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
            <Text style={styles.buttonText}>Effacer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.logContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.emptyText}>
              Aucun log. Appuyez sur un bouton de test.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  logContainer: {
    flex: 1,
    padding: 20,
  },
  logText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
});
