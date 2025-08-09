import { BlurView } from '@react-native-community/blur';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeCameraRef } from './NativeCamera';
import {
  CameraIcon,
  FlashAutoIcon,
  FlashOffIcon,
  FlashOnIcon,
  GalleryIcon,
  RecordIcon,
  StopIcon,
  SwitchCameraIcon
} from './VideoControl/Icons';

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface VideoControlsProps {
  cameraRef: React.RefObject<NativeCameraRef>;
  style?: any;
  disabled?: boolean;
  showTopControls?: boolean;
  showBottomControls?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (result?: any) => void;
  onPhotoCaptured?: (result?: any) => void;
  initialFlashMode?: 'on' | 'off' | 'auto';
  initialCameraPosition?: 'front' | 'back';
}

export const VideoControls: React.FC<VideoControlsProps> = memo(({
  cameraRef,
  style,
  disabled = false,
  showTopControls = true,
  showBottomControls = true,
  onRecordingStart,
  onRecordingStop,
  onPhotoCaptured,
  initialFlashMode = 'off',
  initialCameraPosition = 'back',
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [flashMode, setFlashMode] = useState<'on' | 'off' | 'auto'>(initialFlashMode);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>(initialCameraPosition);
  const [, setRecordingSize] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const blink = useRef(new Animated.Value(0)).current;
  const recordButtonScale = useRef(new Animated.Value(1)).current;
  const photoButtonScale = useRef(new Animated.Value(1)).current;
  const galleryButtonScale = useRef(new Animated.Value(1)).current;
  const recordPulse = useRef(new Animated.Value(0)).current;
  
  type IntervalHandle = ReturnType<typeof setInterval> | null;
  const durationTimer = useRef<IntervalHandle>(null);
  const progressTimer = useRef<IntervalHandle>(null);

  // Animations d'enregistrement et pulsation
  useEffect(() => {
    if (recordingState === 'recording') {
      // Animation de clignotement du point rouge
      Animated.loop(
        Animated.sequence([
          Animated.timing(blink, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
      
      // Animation de pulsation du bouton d'enregistrement
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(recordPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      blink.setValue(0);
      recordPulse.setValue(1);
    }
  }, [recordingState, blink, recordPulse]);

  // Timers: duration + progress (size)
  useEffect(() => {
    if (recordingState === 'recording') {
      durationTimer.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
      progressTimer.current = setInterval(async () => {
        try {
          const prog = await (cameraRef.current as any)?.getCurrentFileSize?.();
          if (typeof prog === 'number') setRecordingSize(prog);
        } catch (e) {
          // ignore transient errors
        }
      }, 1000);
    } else {
      if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null; }
      if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
      setRecordingDuration(0);
      setRecordingSize(0);
    }
    return () => {
      if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null; }
      if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    };
  }, [recordingState, cameraRef]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const flashIcon = useMemo(() => {
    switch (flashMode) {
      case 'on': return <FlashOnIcon size={20} color="#FFD700" />;
      case 'off': return <FlashOffIcon size={20} color="#FFFFFF" strokeWidth={1.5} />;
      case 'auto': return <FlashAutoIcon size={20} color="#00E5FF" />;
      default: return <FlashOnIcon size={20} color="#FFFFFF" />;
    }
  }, [flashMode]);

  // Animations de pression pour les boutons
  const animateButtonPress = useCallback((animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(animValue, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleFlash = useCallback(async () => {
    if (disabled || recordingState === 'recording') return;
    const modes: Array<'on' | 'off' | 'auto'> = ['off', 'on', 'auto'];
    const next = modes[(modes.indexOf(flashMode) + 1) % modes.length];
    try {
      setIsBusy(true);
      await cameraRef.current?.setFlashMode(next);
      setFlashMode(next);
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, disabled, flashMode, recordingState]);

  const toggleCamera = useCallback(async () => {
    if (disabled || recordingState === 'recording') return;
    const next = cameraPosition === 'back' ? 'front' : 'back';
    try {
      setIsBusy(true);
      await cameraRef.current?.switchDevice(next);
      setCameraPosition(next);
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, cameraPosition, disabled, recordingState]);

  const takePhoto = useCallback(async () => {
    if (disabled || recordingState !== 'idle') return;
    try {
      setIsBusy(true);
      const result = await cameraRef.current?.capturePhoto?.({ quality: 0.9 });
      onPhotoCaptured?.(result);
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, disabled, onPhotoCaptured, recordingState]);

  const startRecording = useCallback(async () => {
    if (disabled || recordingState !== 'idle') return;
    try {
      setIsBusy(true);
      await cameraRef.current?.startRecording?.({ quality: 'high', recordAudio: true, maxDuration: 60 });
      setRecordingState('recording');
      onRecordingStart?.();
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, disabled, onRecordingStart, recordingState]);

  const stopRecording = useCallback(async () => {
    if (disabled || recordingState !== 'recording') return;
    try {
      setIsBusy(true);
      setRecordingState('processing');
      const result = await (cameraRef.current?.stopRecording?.());
      onRecordingStop?.(result);
    } finally {
      setRecordingState('idle');
      setIsBusy(false);
    }
  }, [cameraRef, disabled, onRecordingStop, recordingState]);

  // Callbacks avec animations
  const onRecordPress = useCallback(() => {
    animateButtonPress(recordButtonScale);
    return recordingState === 'idle' ? startRecording() : stopRecording();
  }, [animateButtonPress, recordButtonScale, recordingState, startRecording, stopRecording]);

  const onPhotoPress = useCallback(() => {
    animateButtonPress(photoButtonScale);
    return takePhoto();
  }, [animateButtonPress, photoButtonScale, takePhoto]);

  const onGalleryPress = useCallback(() => {
    animateButtonPress(galleryButtonScale);
    // Action galerie à implémenter
  }, [animateButtonPress, galleryButtonScale]);

  return (
    <View pointerEvents={isBusy ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, style]}>
      {/* Recording timer + dot */}
      {recordingState === 'recording' && (
        <View style={styles.recordingIndicator}>
          <LinearGradient 
            colors={['rgba(255, 0, 0, 0.9)', 'rgba(139, 0, 0, 0.9)']} 
            style={styles.recordingBackground}
            start={{x: 0, y: 0}} 
            end={{x: 1, y: 1}}
          >
            <Animated.View style={[styles.recordingDot, { opacity: blink }]} />
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
          </LinearGradient>
        </View>
      )}

      {/* Top controls */}
      {showTopControls && (
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={[styles.modernControlButton, disabled || recordingState === 'recording' ? styles.disabledControl : null]} 
            onPress={toggleFlash} 
            disabled={disabled || recordingState === 'recording'}
          >
            <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
              {flashIcon}
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.modernControlButton, disabled || recordingState === 'recording' ? styles.disabledControl : null]} 
            onPress={toggleCamera} 
            disabled={disabled || recordingState === 'recording'}
          >
            <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
              <SwitchCameraIcon size={20} color="#FFFFFF" strokeWidth={1.5} />
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom controls */}
      {showBottomControls && (
        <BlurView style={styles.bottomControls} blurType="dark" blurAmount={15}>
          <LinearGradient 
            colors={['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)']} 
            style={styles.bottomGradient}
          >
            {/* Photo Button */}
            <Animated.View style={{ transform: [{ scale: photoButtonScale }] }}>
              <TouchableOpacity
                style={[styles.modernSecondaryButton, recordingState !== 'idle' && styles.disabledButton]}
                onPress={onPhotoPress}
                disabled={disabled || recordingState !== 'idle'}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={recordingState !== 'idle' 
                    ? ['rgba(100, 100, 100, 0.3)', 'rgba(60, 60, 60, 0.3)']
                    : ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.buttonGradient}
                >
                  <CameraIcon size={28} color={recordingState !== 'idle' ? '#666' : '#FFFFFF'} strokeWidth={1.5} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Record Button */}
            <Animated.View style={{ 
              transform: [
                { scale: recordButtonScale },
                { scale: recordingState === 'recording' ? recordPulse : 1 }
              ] 
            }}>
              <TouchableOpacity
                style={styles.recordButtonContainer}
                onPress={onRecordPress}
                disabled={disabled || recordingState === 'processing'}
                activeOpacity={0.9}
              >
                <View style={styles.recordButtonOuter}>
                  <LinearGradient
                    colors={recordingState === 'recording' 
                      ? ['#FF6B6B', '#FF3838'] 
                      : recordingState === 'processing'
                      ? ['#666666', '#444444']
                      : ['#FF4757', '#FF2F3F']}
                    style={styles.recordButton}
                  >
                    {recordingState === 'processing' ? (
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    ) : (
                      <View style={styles.recordButtonInner}>
                        {recordingState === 'recording' ? (
                          <StopIcon size={32} color="#FFFFFF" />
                        ) : (
                          <RecordIcon size={36} color="#FFFFFF" strokeWidth={2} />
                        )}
                      </View>
                    )}
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Gallery Button */}
            <Animated.View style={{ transform: [{ scale: galleryButtonScale }] }}>
              <TouchableOpacity 
                style={styles.modernSecondaryButton}
                onPress={onGalleryPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.buttonGradient}
                >
                  <GalleryIcon size={28} color="#FFFFFF" strokeWidth={1.5} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </BlurView>
      )}
    </View>
  );
});

VideoControls.displayName = 'VideoControls';

const styles = StyleSheet.create({
  // Recording indicator moderne
  recordingIndicator: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordingBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  recordingTime: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Contrôles du haut modernes
  topControls: {
    position: 'absolute',
    top: 60,
    right: 24,
    gap: 20,
  },
  modernControlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  disabledControl: {
    opacity: 0.4,
  },

  // Contrôles du bas avec glassmorphism
  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  bottomGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 50,
    paddingBottom: 40, // Safe area bottom
  },

  // Boutons secondaires modernes
  modernSecondaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledButton: {
    opacity: 0.4,
  },

  // Bouton d'enregistrement premium
  recordButtonContainer: {
    padding: 6,
  },
  recordButtonOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 12,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  recordButton: {
    flex: 1,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VideoControls;


