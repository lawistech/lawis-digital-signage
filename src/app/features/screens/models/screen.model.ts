// // src/app/features/screens/models/screen.model.ts

// export interface Screen {
//   id: string;
//   area_id: string;  // Added area_id property
//   name: string;
//   areaId: string;
//   areaName: string;
//   status: 'online' | 'offline' | 'maintenance' | 'error';
//   resolution: string;
//   orientation: 'landscape' | 'portrait';
//   lastPing: string;
//   currentPlaylist?: string;
//   nextPlaylist?: string;
//   schedule?: ScreenSchedule;
//   hardware: ScreenHardware;
//   network: NetworkConfig;
//   location: LocationInfo;
//   settings: ScreenSettings;
//   analytics: ScreenAnalytics;
//   maintenance: MaintenanceInfo;
//   tags?: string[];
// }

// // Add ScreenFilters interface
// export interface ScreenFilters {
//   areaId: string;
//   status: '' | 'online' | 'offline' | 'maintenance' | 'error';
// }

// export interface ScreenSchedule {
//   current: PlaylistSchedule;
//   upcoming: PlaylistSchedule[];
//   override?: {
//     playlist: string;
//     startTime: string;
//     endTime: string;
//     priority: number;
//   };
// }

// export interface PlaylistSchedule {
//   playlistId: string;
//   playlistName: string;
//   startTime: string;
//   endTime: string;
//   daysOfWeek: string[];
//   priority: number;
// }

// export interface ScreenHardware {
//   model: string;
//   manufacturer: string;
//   serialNumber: string;
//   displaySize: string;
//   brightnessLevel: number;
//   contrastRatio: string;
//   supportedResolutions: string[];
//   operatingHours: number;
// }

// export interface NetworkConfig {
//   ipAddress: string;
//   macAddress: string;
//   connectionType: 'wifi' | 'ethernet';
//   signalStrength?: number;
//   subnet: string;
//   gateway: string;
//   dns: string[];
//   lastConfigUpdate: string;
// }

// export interface LocationInfo {
//   building: string;
//   floor: string;
//   room: string;
//   area: string;
//   coordinates?: {
//     lat: number;
//     lng: number;
//   };
// }

// export interface ScreenSettings {
//   autoStart: boolean;
//   autoUpdate: boolean;
//   remoteControl: boolean;
//   powerSchedule: {
//     enabled: boolean;
//     powerOn: string;
//     powerOff: string;
//     daysActive: string[];
//   };
//   contentCaching: boolean;
//   fallbackContent: string;
//   refreshInterval: number;
//   screenRotation: 0 | 90 | 180 | 270;
// }

// export interface ScreenAnalytics {
//   uptime: number;
//   lastReboot: string;
//   averagePlaybackTime: number;
//   errors: {
//     count: number;
//     lastError: string;
//     errorHistory: ErrorLog[];
//   };
//   performance: {
//     cpuUsage: number;
//     memoryUsage: number;
//     storageUsage: number;
//     temperature: number;
//   };
// }

// export interface ErrorLog {
//   timestamp: string;
//   code: string;
//   message: string;
//   severity: 'low' | 'medium' | 'high' | 'critical';
//   resolved: boolean;
// }

// export interface MaintenanceInfo {
//   lastMaintenance: string;
//   nextScheduledMaintenance: string;
//   maintenanceHistory: MaintenanceLog[];
//   warranties: {
//     status: 'active' | 'expired' | 'expiring';
//     expirationDate: string;
//     provider: string;
//   };
// }

// export interface MaintenanceLog {
//   date: string;
//   type: 'routine' | 'repair' | 'update' | 'emergency';
//   description: string;
//   technician: string;
//   cost?: number;
// }