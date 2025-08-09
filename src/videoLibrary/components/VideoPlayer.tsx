import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Tentative d'utilisation de react-native-video si disponible
let RNVideo: any = null;
try {
   
  RNVideo = require('react-native-video');
} catch (e) {
  RNVideo = null;
}

interface VideoPlayerProps {
  uri: string;
  style?: any;
  onError?: (error: string) => void;
  onLoad?: () => void;
  autoPlay?: boolean;
  controls?: boolean;
  resizeMode?: 'contain' | 'cover' | 'stretch';
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  style,
  onError,
  onLoad,
  autoPlay = true,
  controls = true,
  resizeMode = 'contain',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(!autoPlay);

  if (!RNVideo) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.noPlayerContainer}>
          <Text style={styles.noPlayerText}>
            Lecteur vidéo non disponible
          </Text>
          <Text style={styles.installText}>
            Installez react-native-video pour lire les vidéos
          </Text>
          <Text style={styles.uriText} selectable>
            {uri}
          </Text>
        </View>
      </View>
    );
  }

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = (err: any) => {
    setLoading(false);
    const errorMsg = err?.error?.localizedDescription || 'Erreur de lecture vidéo';
    setError(errorMsg);
    onError?.(errorMsg);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur de lecture</Text>
          <Text style={styles.errorDetails}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <RNVideo
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          paused={paused}
          controls={controls}
          onLoad={handleLoad}
          onError={handleError}
          onBuffer={(data: any) => {
            // Gestion du buffering si nécessaire
          }}
        />
      )}

      {!controls && !error && !loading && (
        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
          <Text style={styles.playIcon}>{paused ? '▶️' : '⏸️'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetails: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4da3ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  noPlayerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPlayerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  installText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  uriText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
  },
});
