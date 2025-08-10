import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

interface ProfileStat {
  label: string;
  value: string;
}

export const ProfileScreen = ({ navigation }: any) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Données utilisateur fictives
  const userData = {
    name: 'Marie Dupont',
    email: 'marie.dupont@example.com',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'Passionnée de photographie et de voyages. J\'aime capturer les moments uniques de la vie.',
    joinDate: 'Membre depuis janvier 2024',
  };

  const stats: ProfileStat[] = [
    { label: 'Photos', value: '234' },
    { label: 'Vidéos', value: '45' },
    { label: 'Abonnés', value: '1.2k' },
  ];

  const menuItems = [
    { icon: 'image', label: 'Mes photos', onPress: () => {} },
    { icon: 'video', label: 'Mes vidéos', onPress: () => {} },
    { icon: 'heart', label: 'Favoris', onPress: () => {} },
    { icon: 'folder', label: 'Albums', onPress: () => {} },
    { icon: 'download', label: 'Téléchargements', onPress: () => {} },
  ];

  const settingsItems = [
    { icon: 'user', label: 'Modifier le profil', onPress: () => {} },
    { icon: 'lock', label: 'Sécurité et confidentialité', onPress: () => {} },
    { icon: 'credit-card', label: 'Abonnement', onPress: () => {} },
    { icon: 'help-circle', label: 'Aide et support', onPress: () => {} },
    { icon: 'info', label: 'À propos', onPress: () => {} },
  ];

  const handleLogout = () => {
    // Logique de déconnexion
    navigation.navigate('Login');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="settings" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* Avatar et informations */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              <TouchableOpacity style={styles.editAvatarButton}>
                <Icon name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            <Text style={styles.userBio}>{userData.bio}</Text>
            <Text style={styles.joinDate}>{userData.joinDate}</Text>
          </View>

          {/* Statistiques */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* Menu principal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mon contenu</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Icon name={item.icon} size={20} color="#667eea" />
              </View>
              <Text style={styles.menuItemText}>{item.label}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Paramètres rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres rapides</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
              <Icon name="bell" size={20} color="#667eea" />
            </View>
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#ccc', true: '#667eea' }}
            thumbColor={notificationsEnabled ? '#764ba2' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
              <Icon name="moon" size={20} color="#667eea" />
            </View>
            <Text style={styles.menuItemText}>Mode sombre</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#ccc', true: '#667eea' }}
            thumbColor={darkModeEnabled ? '#764ba2' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Paramètres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Icon name={item.icon} size={20} color="#667eea" />
              </View>
              <Text style={styles.menuItemText}>{item.label}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Bouton de déconnexion */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LinearGradient
          colors={['#ff6b6b', '#ee5a24']}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Icon name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  settingsButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: -10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#764ba2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  userBio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 30,
    marginBottom: 5,
  },
  joinDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
  },
  gradientButton: {
    flexDirection: 'row',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  bottomSpacing: {
    height: 30,
  },
});