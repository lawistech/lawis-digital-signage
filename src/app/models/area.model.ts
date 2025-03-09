// area.model.ts
export interface Area {
  id: string;
  name: string;
  description?: string;
  location: string;
  screenCount: number;
  status: 'active' | 'inactive';
  lastUpdated: Date;
  stats: {
    onlineScreens: number;
    totalScreens: number;
    activePlaylist: string;
    uptime: string; // e.g., "99.9%"
    lastUpdated: string; // e.g., "2 minutes ago"
  };
  screens: Screen[];
}

export interface CreateAreaDto {
  name: string;
  description?: string;
  location: string;
  screenIds?: string[]; // Ensure this property exists and is optional
}