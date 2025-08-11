import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { routeBus } from './routeBus';

interface ModernCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  gradient: string[];
  size: 'large' | 'medium';
  index: number;
}

const ModernCard: React.FC<ModernCardProps> = React.memo(({ 
  title, 
  description, 
  icon, 
  onPress, 
  gradient, 
  size, 
  index 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 200;
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, index]);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => onPress());
  }, [onPress, scaleAnim]);

  return (
    <Animated.View 
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <TouchableOpacity 
        style={[
          styles.modernCard, 
          size === 'large' ? styles.largeCard : styles.mediumCard,
          { backgroundColor: gradient[0] }
        ]} 
        onPress={handlePress} 
        activeOpacity={0.9}
      >
        <View style={styles.cardGlow} />
        <View style={styles.cardShine} />
        <View style={styles.cardContent}>
          <Text style={styles.modernIcon}>{icon}</Text>
          <Text style={styles.modernTitle}>{title}</Text>
          <Text style={styles.modernDescription}>{description}</Text>
        </View>
        <View style={[styles.cardGradient, { backgroundColor: gradient[1] }]} />
      </TouchableOpacity>
    </Animated.View>
  );
});

export const HomeScreen: React.FC = () => {

  const navigateTo = useCallback((route: string) => {
    routeBus.emit(route as any);
  }, []);

  const features = useMemo(() => [
    {
      title: 'Caméra Pro',
      description: 'Enregistrement vidéo haute qualité avec contrôles professionnels',
      icon: '🎬',
      route: 'Camera',
      gradient: ['#FF6B6B', '#FF5252'],
      size: 'large' as const,
    },
    {
      title: 'Éditeur',
      description: 'Création de contenu textuel avec IA intégrée',
      icon: '✨',
      route: 'Editeur',
      gradient: ['#4ECDC4', '#26A69A'],
      size: 'medium' as const,
    },

    {
      title: 'Téléprompter',
      description: 'Lecture de texte fluide pour vos vidéos',
      icon: '📖',
      route: 'Teleprompteur',
      gradient: ['#FFB74D', '#FF9800'],
      size: 'medium' as const,
    },
    {
      title: 'Bibliothèque',
      description: 'Gérez et organisez vos créations',
      icon: '📚',
      route: 'Vidéos',
      gradient: ['#9C27B0', '#673AB7'],
      size: 'medium' as const,
    },
  ], []);



  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0B" />
      <SafeAreaView style={styles.container}>


        {/* Features Grid */}
        <Animated.ScrollView 
          style={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featuresGrid}>
            <Text style={styles.sectionTitle}>Fonctionnalités</Text>
            {features.map((feature, index) => (
              <ModernCard
                key={feature.route}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                gradient={feature.gradient}
                size={feature.size}
                index={index}
                onPress={() => navigateTo(feature.route)}
              />
            ))}
          </View>
          
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Votre créativité sans limites</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4K</Text>
                <Text style={styles.statLabel}>Qualité Vidéo</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>∞</Text>
                <Text style={styles.statLabel}>Possibilités</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>Pro</Text>
                <Text style={styles.statLabel}>Niveau</Text>
              </View>
            </View>
          </View>
          
          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  

  
  // Scroll Container
  scrollContainer: {
    flex: 1,
    paddingTop: 30,
  },
  
  // Features Grid
  featuresGrid: {
    paddingHorizontal: 20,
    gap: 18,
  },

  // Section Title
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  
  // Modern Cards
  modernCard: {
    borderRadius: 28,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  largeCard: {
    height: 180,
    marginBottom: 12,
  },
  mediumCard: {
    height: 140,
    marginBottom: 12,
  },
  cardGlow: {
    position: 'absolute',
    top: -25,
    left: -25,
    right: -25,
    bottom: -25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 40,
    zIndex: 1,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2,
  },
  cardContent: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    zIndex: 4,
    position: 'relative',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2,
    zIndex: 3,
  },
  modernIcon: {
    fontSize: 36,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modernTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Stats Section
  statsSection: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4A9EFF',
    marginBottom: 8,
    textShadowColor: 'rgba(74, 158, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Bottom Spacer
  bottomSpacer: {
    height: 60,
  },
});

export default HomeScreen;
