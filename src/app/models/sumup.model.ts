// src/app/models/sumup.model.ts
import { Playlist } from './playlist.model';

export interface Sumup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  status: 'active' | 'inactive' | 'draft';
  playlist_ids: string[];
  playlists?: Playlist[];
}

export interface CreateSumupDto {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  playlist_ids?: string[];
}

export interface UpdateSumupDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  playlist_ids?: string[];
}