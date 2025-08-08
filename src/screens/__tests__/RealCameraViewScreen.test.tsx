/**
 * Tests pour l'écran d'enregistrement vidéo
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { RealCameraViewScreen } from '../RealCameraViewScreen';

// Mock du module caméra natif sans référencer React hors du scope jest.mock
jest.mock('../../camera/components/NativeCamera', () => {
  const ReactLocal = require('react');
  return {
    NativeCamera: ReactLocal.forwardRef(({ children, onCameraReady }: any, ref: any) => {
      ReactLocal.useImperativeHandle(ref, () => ({
        startCamera: jest.fn().mockResolvedValue(true),
        stopCamera: jest.fn().mockResolvedValue(true),
        switchDevice: jest.fn().mockResolvedValue(true),
        capturePhoto: jest.fn().mockResolvedValue({
          uri: 'test-photo.jpg',
          width: 1920,
          height: 1080,
          size: 1024000,
        }),
        startRecording: jest.fn().mockResolvedValue(true),
        stopRecording: jest.fn().mockResolvedValue({
          uri: 'test-video.mp4',
          duration: 10,
          size: 5242880,
          width: 1920,
          height: 1080,
        }),
        setFlashMode: jest.fn().mockResolvedValue(true),
        isReady: true,
        isActive: true,
        isCapturing: false,
        isRecording: false,
      }));

      ReactLocal.useEffect(() => {
        if (onCameraReady) {
          onCameraReady();
        }
      }, [onCameraReady]);

      return <>{children}</>;
    }),
  };
});

// Mock du module natif d'égaliseur pour Jest
jest.mock('../../../specs/NativeAudioEqualizerModule', () => ({
  __esModule: true,
  default: {
    setEQEnabled: jest.fn(),
    getEQEnabled: jest.fn(() => false),
    setBandGain: jest.fn(),
    getBandGain: jest.fn(() => 0),
    setPreset: jest.fn(),
    getCurrentPreset: jest.fn(() => 'Flat'),
    getSpectrumData: jest.fn(() => []),
    startSpectrumAnalysis: jest.fn(),
    stopSpectrumAnalysis: jest.fn(),
  },
}));

// Mock d'Alert
jest.spyOn(Alert, 'alert');

describe('RealCameraViewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait afficher l'écran correctement", async () => {
    const { getByText } = render(<RealCameraViewScreen />);
    await waitFor(() => {
      expect(getByText('📷')).toBeTruthy();
    });
  });

  it('devrait masquer le loader une fois la caméra prête', async () => {
    const { queryByText } = render(<RealCameraViewScreen />);
    
    await waitFor(() => {
      expect(queryByText('Initialisation de la caméra...')).toBeNull();
    });
  });

  it('devrait afficher les contrôles après l\'initialisation', async () => {
    const { getByText } = render(<RealCameraViewScreen />);
    
    await waitFor(() => {
      expect(getByText('📷')).toBeTruthy(); // Bouton photo
      expect(getByText('🔄')).toBeTruthy(); // Bouton switch caméra
      expect(getByText('⚡̸')).toBeTruthy(); // Bouton flash (off par défaut)
    });
  });

  it('devrait capturer une photo', async () => {
    const { getByText } = render(<RealCameraViewScreen />);
    
    await waitFor(() => {
      const photoButton = getByText('📷');
      fireEvent.press(photoButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('devrait basculer entre les modes flash', async () => {
    const { getByText } = render(<RealCameraViewScreen />);
    
    await waitFor(() => {
      // Flash off par défaut
      expect(getByText('⚡̸')).toBeTruthy();
      
      // Cliquer pour passer en mode on
      fireEvent.press(getByText('⚡̸'));
    });

    await waitFor(() => {
      expect(getByText('⚡')).toBeTruthy();
    });
  });

  it('devrait gérer les erreurs de la caméra', async () => {
    const { getByTestId } = render(<RealCameraViewScreen />);
    
    // Simuler une erreur
    const error = new Error('Caméra non disponible');
    
    // Le composant devrait gérer l'erreur et afficher une alerte
    // (Cette partie dépend de l'implémentation réelle du gestionnaire d'erreur)
  });
});

describe('Enregistrement vidéo', () => {
  it('devrait démarrer et arrêter l\'enregistrement', async () => {
    const { getByTestId, getByText, queryByText } = render(<RealCameraViewScreen />);
    
    await waitFor(() => {
      // Vérifier que le timer n'est pas affiché
      expect(queryByText(/00:00/)).toBeNull();
    });

    // Démarrer l'enregistrement
    // (Le bouton d'enregistrement n'a pas de texte, il faudrait ajouter un testID)
    
    // Vérifier que le timer apparaît
    // await waitFor(() => {
    //   expect(getByText(/00:0[0-9]/)).toBeTruthy();
    // });
  });

  it('devrait afficher une alerte après l\'enregistrement', async () => {
    // Test similaire pour vérifier l'alerte de succès après l'enregistrement
  });

  it('devrait désactiver les contrôles pendant l\'enregistrement', async () => {
    // Test pour vérifier que les boutons sont désactivés pendant l'enregistrement
  });
});