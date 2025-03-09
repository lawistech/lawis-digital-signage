// src/app/features/areas/models/area-dialog.model.ts
export interface CreateAreaDialogData {
  name: string;
  description?: string;
  location: string;
}

// Keep this for reference if needed later
export interface AreaOrientation {
  value: 'landscape' | 'portrait';
  label: string;
  description: string;
  icon: string;
}