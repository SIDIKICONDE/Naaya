import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VideoResult } from '../../../specs/NativeCameraModule';
import type { SavedVideoEntry, VideoFilterOptions, VideoLibraryConfig, VideoSortOption } from '../types';

const STORAGE_KEY = '@naaya/videos/library.v2';
const CONFIG_KEY = '@naaya/videos/config';

/**
 * Service principal de la bibliothèque vidéo
 */
export class VideoLibrary {
  private static instance: VideoLibrary;
  private config: VideoLibraryConfig = {
    maxVideos: 100,
    autoCleanup: true,
    compressionEnabled: false,
    thumbnailGeneration: true,
  };
  private configLoaded: boolean = false;
  private configLoadPromise: Promise<void> | null = null;

  private constructor() {
    // Don't call async methods in constructor
    // Config will be loaded lazily on first use
  }

  static getInstance(): VideoLibrary {
    if (!VideoLibrary.instance) {
      VideoLibrary.instance = new VideoLibrary();
    }
    return VideoLibrary.instance;
  }

  /**
   * Ensures config is loaded before operations
   */
  private async ensureConfigLoaded(): Promise<void> {
    if (this.configLoaded) return;
    
    if (!this.configLoadPromise) {
      this.configLoadPromise = this.loadConfig();
    }
    
    await this.configLoadPromise;
  }

  /**
   * Ajoute une vidéo à la bibliothèque
   */
  async addVideo(result: VideoResult): Promise<SavedVideoEntry> {
    await this.ensureConfigLoaded();
    
    const entry: SavedVideoEntry = {
      id: this.generateId(),
      createdAt: Date.now(),
      filename: this.deriveFilename(result.uri),
      ...result,
    };

    const all = await this.loadAll();
    all.unshift(entry);

    // Nettoyage automatique si configuré
    if (this.config.autoCleanup && this.config.maxVideos) {
      if (all.length > this.config.maxVideos) {
        all.splice(this.config.maxVideos);
      }
    }

    await this.saveAll(all);
    return entry;
  }

  /**
   * Liste toutes les vidéos avec filtres et tri
   */
  async listVideos(
    filters?: VideoFilterOptions,
    sortBy: VideoSortOption = 'date-desc'
  ): Promise<SavedVideoEntry[]> {
    await this.ensureConfigLoaded();
    let items = await this.loadAll();

    // Appliquer les filtres
    if (filters) {
      items = this.applyFilters(items, filters);
    }

    // Appliquer le tri
    items = this.applySort(items, sortBy);

    return items;
  }

  /**
   * Supprime une vidéo par ID
   */
  async removeVideo(id: string): Promise<void> {
    await this.ensureConfigLoaded();
    const all = await this.loadAll();
    const next = all.filter(v => v.id !== id);
    await this.saveAll(next);
  }

  /**
   * Récupère une vidéo par ID
   */
  async getById(id: string): Promise<SavedVideoEntry | undefined> {
    await this.ensureConfigLoaded();
    const all = await this.loadAll();
    return all.find(v => v.id === id);
  }

  /**
   * Met à jour les métadonnées d'une vidéo
   */
  async updateVideo(id: string, updates: Partial<SavedVideoEntry>): Promise<SavedVideoEntry | null> {
    await this.ensureConfigLoaded();
    const all = await this.loadAll();
    const index = all.findIndex(v => v.id === id);
    
    if (index === -1) return null;

    all[index] = { ...all[index], ...updates };
    await this.saveAll(all);
    return all[index];
  }

  /**
   * Vide toute la bibliothèque
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Récupère les statistiques de la bibliothèque
   */
  async getStats(): Promise<{
    totalVideos: number;
    totalSize: number;
    averageDuration: number;
    oldestVideo?: Date;
    newestVideo?: Date;
  }> {
    await this.ensureConfigLoaded();
    const videos = await this.loadAll();
    
    if (videos.length === 0) {
      return {
        totalVideos: 0,
        totalSize: 0,
        averageDuration: 0,
      };
    }

    const totalSize = videos.reduce((sum, v) => sum + v.size, 0);
    const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
    const dates = videos.map(v => new Date(v.createdAt));

    return {
      totalVideos: videos.length,
      totalSize,
      averageDuration: totalDuration / videos.length,
      oldestVideo: new Date(Math.min(...dates.map(d => d.getTime()))),
      newestVideo: new Date(Math.max(...dates.map(d => d.getTime()))),
    };
  }

  /**
   * Met à jour la configuration
   */
  async updateConfig(newConfig: Partial<VideoLibraryConfig>): Promise<void> {
    await this.ensureConfigLoaded();
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Récupère la configuration actuelle
   */
  async getConfig(): Promise<VideoLibraryConfig> {
    await this.ensureConfigLoaded();
    return { ...this.config };
  }

  // === MÉTHODES PRIVÉES ===

  private async loadAll(): Promise<SavedVideoEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      
      const parsed = JSON.parse(raw) as SavedVideoEntry[];
      if (!Array.isArray(parsed)) return [];
      
      return parsed;
    } catch {
      return [];
    }
  }

  private async saveAll(items: SavedVideoEntry[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private async loadConfig(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CONFIG_KEY);
      if (raw) {
        this.config = { ...this.config, ...JSON.parse(raw) };
      }
    } catch {
      // Utiliser la config par défaut
    } finally {
      this.configLoaded = true;
      this.configLoadPromise = null;
    }
  }

  private generateId(): string {
    const now = Date.now();
    const rand = Math.floor(Math.random() * 1e9);
    return `vid_${now}_${rand}`;
  }

  private deriveFilename(uri: string): string | undefined {
    try {
      const withoutQuery = uri.split('?')[0];
      const parts = withoutQuery.split('/');
      return parts[parts.length - 1] || undefined;
    } catch {
      return undefined;
    }
  }

  private applyFilters(items: SavedVideoEntry[], filters: VideoFilterOptions): SavedVideoEntry[] {
    return items.filter(item => {
      // Filtre par date
      if (filters.dateRange) {
        const itemDate = new Date(item.createdAt);
        if (itemDate < filters.dateRange.start || itemDate > filters.dateRange.end) {
          return false;
        }
      }

      // Filtre par durée
      if (filters.durationRange) {
        const duration = item.duration || 0;
        if (duration < filters.durationRange.min || duration > filters.durationRange.max) {
          return false;
        }
      }

      // Filtre par tags
      if (filters.tags && filters.tags.length > 0) {
        if (!item.tags || !filters.tags.some(tag => item.tags!.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  private applySort(items: SavedVideoEntry[], sortBy: VideoSortOption): SavedVideoEntry[] {
    const sorted = [...items];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'date-asc':
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'duration-desc':
        return sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
      case 'duration-asc':
        return sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0));
      case 'size-desc':
        return sorted.sort((a, b) => b.size - a.size);
      case 'size-asc':
        return sorted.sort((a, b) => a.size - b.size);
      case 'name-asc':
        return sorted.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
      case 'name-desc':
        return sorted.sort((a, b) => (b.filename || '').localeCompare(a.filename || ''));
      default:
        return sorted;
    }
  }
}

// Export de l'instance singleton
export const videoLibrary = VideoLibrary.getInstance();
