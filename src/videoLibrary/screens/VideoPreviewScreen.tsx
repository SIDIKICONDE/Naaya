import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { VideoPlayer } from '../components/VideoPlayer';
import { videoLibrary } from '../services/VideoLibrary';
import type { SavedVideoEntry, VideoSortOption } from '../types';

export const VideoPreviewScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SavedVideoEntry[]>([]);
  const [selected, setSelected] = useState<SavedVideoEntry | null>(null);
  const [sortBy, setSortBy] = useState<VideoSortOption>('date-desc');
  const [stats, setStats] = useState<any>(null);
  const listRef = useRef<FlatList<SavedVideoEntry>>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        videoLibrary.listVideos(undefined, sortBy),
        videoLibrary.getStats(),
      ]);
      setItems(list);
      setStats(statsData);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les vidéos');
    } finally {
      setLoading(false);
    }
  }, [selected, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  const removeItem = useCallback(async (id: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette vidéo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await videoLibrary.removeVideo(id);
              await load();
              if (selected?.id === id) {
                setSelected(null);
              }
            } catch (err) {
              Alert.alert('Erreur', 'Suppression impossible');
            }
          },
        },
      ]
    );
  }, [selected, load]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: SavedVideoEntry }) => {
    const isActive = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => setSelected(item)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.filename || 'Vidéo sans nom'}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeItem(item.id)}
          >
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>
            📅 {formatDate(item.createdAt)}
          </Text>
          <Text style={styles.metaText}>
            ⏱️ {formatDuration(item.duration || 0)}
          </Text>
          <Text style={styles.metaText}>
            💾 {formatSize(item.size)}
          </Text>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSortButton = (option: VideoSortOption, label: string) => (
    <TouchableOpacity
      style={[styles.sortButton, sortBy === option && styles.sortButtonActive]}
      onPress={() => setSortBy(option)}
    >
      <Text style={[styles.sortButtonText, sortBy === option && styles.sortButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Zone de prévisualisation */}
      <View style={styles.previewArea}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : selected ? (
          <VideoPlayer
            uri={selected.uri}
            style={StyleSheet.absoluteFill}
            controls={true}
            autoPlay={false}
          />
        ) : (
          <View style={styles.noSelectionBox}>
            <Text style={styles.noSelectionText}>Aucune vidéo sélectionnée</Text>
          </View>
        )}
      </View>

      {/* Zone de liste */}
      <View style={styles.listArea}>
        {/* En-tête avec statistiques et tri */}
        <View style={styles.listHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.listTitle}>Bibliothèque vidéo</Text>
            {stats && (
              <Text style={styles.statsText}>
                {stats.totalVideos} vidéos • {formatSize(stats.totalSize)}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={load} style={styles.refreshButton}>
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Boutons de tri */}
        <View style={styles.sortContainer}>
          {renderSortButton('date-desc', 'Plus récentes')}
          {renderSortButton('date-asc', 'Plus anciennes')}
          {renderSortButton('duration-desc', 'Plus longues')}
          {renderSortButton('size-desc', 'Plus grosses')}
        </View>

        {/* Liste des vidéos */}
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucune vidéo disponible</Text>
            <Text style={styles.emptySubtext}>
              Enregistrez des vidéos depuis l'écran Caméra
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(v) => v.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewArea: {
    flex: 2,
    backgroundColor: '#111',
  },
  listArea: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },

  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 8,
  },

  noSelectionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    color: '#888',
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#222',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsText: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 16,
  },

  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#222',
  },
  sortButtonActive: {
    backgroundColor: '#4da3ff',
  },
  sortButtonText: {
    color: '#ccc',
    fontSize: 12,
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  listContent: {
    padding: 8,
  },
  item: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#151515',
    marginBottom: 8,
  },
  itemActive: {
    borderColor: '#4da3ff',
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    fontSize: 16,
  },
  itemMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  metaText: {
    color: '#999',
    fontSize: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#ccc',
    fontSize: 10,
  },

  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default VideoPreviewScreen;
