import type { VideoResult } from '../../specs/NativeCameraModule';

/**
 * Métadonnées étendues pour les vidéos sauvegardées
 */
export interface VideoMetadata {
  id: string;
  createdAt: number;
  filename?: string;
  tags?: string[];
  description?: string;
  thumbnail?: string;
}

/**
 * Entrée vidéo complète avec métadonnées
 */
export interface SavedVideoEntry extends VideoResult, VideoMetadata {}

/**
 * Options de filtrage pour la bibliothèque
 */
export interface VideoFilterOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  durationRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

/**
 * Options de tri pour la bibliothèque
 */
export type VideoSortOption = 
  | 'date-desc' 
  | 'date-asc' 
  | 'duration-desc' 
  | 'duration-asc' 
  | 'size-desc' 
  | 'size-asc' 
  | 'name-asc' 
  | 'name-desc';

/**
 * Configuration de la bibliothèque vidéo
 */
export interface VideoLibraryConfig {
  maxVideos?: number;
  autoCleanup?: boolean;
  compressionEnabled?: boolean;
  thumbnailGeneration?: boolean;
}
