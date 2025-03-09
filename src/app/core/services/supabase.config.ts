// core/services/supabase.config.ts
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environment/environment';

export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseKey
);

// Database types based on your Supabase schema
export interface Database {
  public: {
    Tables: {
      areas: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          location: string;
          status: 'active' | 'inactive';
          screen_count: number;
          stats: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['areas']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['areas']['Insert']>;
      };
      screens: {
        Row: {
          id: string;
          area_id: string;
          name: string;
          status: 'online' | 'offline' | 'maintenance' | 'error';
          channel_id: string;
          channel_name: string;
          resolution: string;
          orientation: 'landscape' | 'portrait';
          last_ping: string;
          current_playlist_id: string | null;
          next_playlist_id: string | null;
          schedule: any;
          hardware: any;
          network: any;
          location: any;
          settings: any;
          analytics: any;
          maintenance: any;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['screens']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['screens']['Insert']>;
      };
    };
  };
}