// create-screen-dialog.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CreateScreenDto } from '../../../../models/screen.model';
import { Area, CreateAreaDto } from '../../../../models/area.model';
import { SupabaseScreenService } from '../../../../core/services/supabase-screen.service';
import { supabase } from '../../../../core/services/supabase.config';
import { AreaService } from '../../../area/services/area.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-screen-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './create-screen-dialog.component.html'
})
export class CreateScreenDialogComponent implements OnInit {
  @Output() onCreate = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  currentStep = 0;
  isVerifying = false;
  isLoading = true;
  isSubmitting = false;
  registrationCode: string = '';
  areas: Area[] = [];
  errorMessage: string | null = null;
  showAreaForm = false;
  areaName = '';
  areaLocation = '';
  areaDescription = '';

  codeForm!: FormGroup;
  screenForm!: FormGroup;
  detectedDevice: any = null;

  steps = [
    {
      title: 'Connect Device',
      description: 'Enter the code shown on your screen'
    },
    {
      title: 'Device Details',
      description: 'Configure your screen settings'
    },
    {
      title: 'Confirmation',
      description: 'Review and complete setup'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private areaService: AreaService,
    private supabaseScreenService: SupabaseScreenService,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadAreas();
  }

  private initializeForms(): void {
    this.codeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });

    this.screenForm = this.fb.group({
      name: ['', [Validators.required]],
      area_id: ['', [Validators.required]],
      orientation: ['landscape', [Validators.required]]
    });
  }

  // Add this method to ensure areas are loaded properly
  ngAfterViewInit() {
    // Force a check for empty areas after the view is initialized
    setTimeout(() => {
      if (this.areas.length === 0 && !this.isLoading) {
        this.loadAreas(); // Try loading again
      }
    }, 500);
  }

  // Simplify area loading to ensure it works
  private loadAreas(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.areaService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.isLoading = false;
        
        // Force change detection
        setTimeout(() => {
          // If we have areas but none selected, select the first one
          if (this.areas.length > 0 && !this.screenForm.get('area_id')?.value) {
            this.screenForm.get('area_id')?.setValue(this.areas[0].id);
          }
        });
      },
      error: (error) => {
        console.error('Error loading areas:', error);
        this.errorMessage = 'Failed to load areas';
        this.isLoading = false;
      }
    });
  }

  retryLoadAreas(): void {
    this.loadAreas();
  }

  toggleAreaForm(): void {
    this.showAreaForm = !this.showAreaForm;
    
    // Reset any error message when toggling the form
    if (this.showAreaForm) {
      this.errorMessage = null;
    }
    
    // Small delay to ensure DOM rendering completes
    setTimeout(() => {
      // If showing the form, focus on the area name input
      if (this.showAreaForm) {
        const areaNameInput = document.querySelector('input[name="areaName"]') as HTMLInputElement;
        if (areaNameInput) areaNameInput.focus();
      }
    }, 0);
  }

  async createNewArea(): Promise<void> {
    if (!this.areaName || !this.areaLocation) {
      this.errorMessage = 'Area name and location are required';
      return;
    }

    const newArea: CreateAreaDto = {
      name: this.areaName,
      location: this.areaLocation,
      description: this.areaDescription || ''
    };

    this.isLoading = true;
    this.errorMessage = null;

    try {
      // Convert Observable to Promise
      const area = await new Promise<Area>((resolve, reject) => {
        this.areaService.createArea(newArea).subscribe({
          next: resolve,
          error: reject
        });
      });
      
      console.log('Area created successfully:', area);
      this.areas = [...this.areas, area];
      this.screenForm.get('area_id')?.setValue(area.id);
      this.resetAreaForm();
    } catch (error) {
      console.error('Error creating area:', error);
      this.errorMessage = 'Failed to create area. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  resetAreaForm(): void {
    this.showAreaForm = false;
    this.areaName = '';
    this.areaLocation = '';
    this.areaDescription = '';
  }

  cancelAreaForm(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.resetAreaForm();
    this.errorMessage = null;
  }

  handleAreaDropdownClick(event: MouseEvent): void {
    // Prevent click propagation if loading
    if (this.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    // If there are no areas, show the area form
    if (this.areas.length === 0) {
      event.preventDefault();
      this.toggleAreaForm();
    }
  }

  async verifyCode(): Promise<void> {
    if (this.codeForm.valid && !this.isVerifying) {
      this.isVerifying = true;
      this.errorMessage = null;
      
      try {
        // Just verify the code, don't mark it as claimed yet
        const code = this.codeForm.get('code')?.value;
        
        try {
          // Try to verify with Supabase
          const { data, error } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('registration_code', code)
            .eq('is_claimed', false) // Ensure it's not claimed
            .single();
            
          if (error) {
            throw new Error('Invalid registration code or already claimed');
          }
          
          if (data) {
            // Store the code for later use
            this.registrationCode = code;
            
            // Extract device info
            this.detectedDevice = {
              model: data.device_info?.userAgent?.split(')')[0] || 'Unknown Device',
              resolution: data.device_info?.resolution || '1920x1080',
              serialNumber: 'SN' + Math.random().toString(36).substr(2, 9),
            };
            
            // Prefill the form with device info if available
            if (data.device_info?.name) {
              this.screenForm.get('name')?.setValue(data.device_info.name);
            }
            
            if (data.device_info?.orientation) {
              this.screenForm.get('orientation')?.setValue(data.device_info.orientation);
            }
            
            this.currentStep = 1;
          } else {
            throw new Error('Invalid registration code');
          }
        } catch (err) {
          console.error('Error checking registration code:', err);
          throw new Error('Invalid registration code or already claimed');
        }
      } catch (error: any) {
        console.error('Error verifying code:', error);
        this.errorMessage = error.message || 'Failed to verify registration code';
      } finally {
        this.isVerifying = false;
      }
    }
  }

  goToReview(): void {
    if (this.screenForm.valid) {
      this.currentStep = 2;
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.screenForm.controls).forEach(key => {
        this.screenForm.get(key)?.markAsTouched();
      });
    }
  }

  getInputClass(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field) return 'bg-gray-50';

    if (field.invalid && (field.dirty || field.touched)) {
      return 'bg-red-50 border-red-300 focus:ring-red-100';
    }

    if (field.valid && field.dirty) {
      return 'bg-green-50 border-green-300 focus:ring-green-100';
    }

    return 'bg-gray-50 border-gray-200 focus:ring-blue-100';
  }

  shouldShowError(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getAreaName(areaId: string): string {
    const area = this.areas.find(a => a.id === areaId);
    return area ? area.name : 'Unknown Area';
  }

  async handleSubmit(): Promise<void> {
    // Check if form is valid and not already submitting
    if (this.screenForm.valid && !this.isSubmitting) {
      this.isSubmitting = true; // Set flag to prevent double submission
      this.errorMessage = null;
    
      const formValue = this.screenForm.value;
      const selectedArea = this.areas.find(a => a.id === formValue.area_id);
      
      if (!selectedArea) {
        console.error('Selected area not found');
        this.errorMessage = 'Selected area not found. Please try again.';
        this.isSubmitting = false; // Reset the flag
        return;
      }
  
      const screenData: CreateScreenDto = {
        name: formValue.name,
        area_id: formValue.area_id,
        channel_id: selectedArea.id, // Use area ID as channel ID
        channel_name: selectedArea.name, // Use area name as channel name
        status: 'offline', // Start as offline until the device connects
        resolution: this.detectedDevice?.resolution || '1920x1080',
        orientation: formValue.orientation,
        last_ping: new Date().toISOString(),
        current_playlist: null, // No playlist assigned initially
        current_playlist_started_at: null,
        next_playlist: null,
        schedule: {
          upcoming: [], // No scheduled content initially
          current: null
        },
        location: {
          building: selectedArea.location || 'Unknown Building',
          floor: '1st Floor',
          room: 'Main Room',
          area: 'General Area'
        },
        hardware: {
          model: this.detectedDevice?.model || 'Generic Display',
          manufacturer: 'Generic',
          serial_number: this.detectedDevice?.serialNumber || `SN${Date.now()}`,
          display_size: '55"',
          brightness_level: 100,
          contrast_ratio: '1000:1',
          supported_resolutions: [this.detectedDevice?.resolution || '1920x1080'],
          operating_hours: 0
        },
        network: {
          ip_address: '192.168.1.100',
          mac_address: '00:00:00:00:00:00',
          connection_type: 'ethernet',
          subnet: '255.255.255.0',
          gateway: '192.168.1.1',
          dns: ['8.8.8.8', '8.8.4.4'],
          last_config_update: new Date().toISOString()
        },
        settings: {
          auto_start: true,
          auto_update: true,
          remote_control: true,
          power_schedule: {
            enabled: true,
            power_on: '08:00',
            power_off: '20:00',
            days_active: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          },
          content_caching: true,
          fallback_content: '',
          refresh_interval: 5,
          screen_rotation: 0
        },
        analytics: {
          uptime: 100,
          last_reboot: new Date().toISOString(),
          average_playback_time: 0,
          errors: {
            count: 0,
            last_error: '',
            error_history: []
          },
          performance: {
            cpu_usage: 0,
            memory_usage: 0,
            storage_usage: 0,
            temperature: 25
          }
        },
        maintenance: {
          last_maintenance: new Date().toISOString(),
          next_scheduled_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          maintenance_history: [],
          warranties: {
            status: 'active',
            expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            provider: 'Manufacturer Warranty'
          }
        },
        tags: ['new'],
      };
  
      console.log('Submitting screen data:', screenData);
      
      // Get the registration code from the stored value
      const registrationCode = this.registrationCode;
      
      try {
        // Create screen using a Promise-based approach for better error handling
        const createdScreen = await new Promise((resolve, reject) => {
          this.supabaseScreenService.createScreen(screenData, registrationCode).subscribe({
            next: resolve,
            error: reject
          });
        });
        
        console.log('Screen created successfully:', createdScreen);
        this.onCreate.emit();
      } catch (error: any) {
        console.error('Error creating screen:', error);
        this.errorMessage = 'Failed to create screen: ' + (error.message || 'Unknown error');
      } finally {
        this.isSubmitting = false; // Reset the submission flag
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.screenForm.controls).forEach(key => {
        this.screenForm.get(key)?.markAsTouched();
      });
    }
  }
}