// create-screen-dialog.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CreateScreenDto } from '../../../../models/screen.model';
import { Area, CreateAreaDto } from '../../../../models/area.model';
import { SupabaseScreenService } from '../../../../core/services/supabase-screen.service';
import { supabase } from '../../../../core/services/supabase.config';
import { AreaService } from '../../../area/services/area.service';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-create-screen-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './create-screen-dialog.component.html'
})
export class CreateScreenDialogComponent implements OnInit, OnDestroy {
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
  
  private destroy$ = new Subject<void>();
  areasInitialized = false;

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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadAreas();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.codeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });

    // Create form with initial empty value for area_id
    this.screenForm = this.fb.group({
      name: ['', [Validators.required]],
      area_id: ['', [Validators.required]],
      orientation: ['landscape', [Validators.required]]
    });
    
    // Add value changes listener for debugging
    this.screenForm.get('area_id')?.valueChanges.subscribe(value => {
      console.log('Area ID changed to:', value);
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
    
    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
    
    // Focus on the area name input
    if (this.showAreaForm) {
      setTimeout(() => {
        const areaNameInput = document.querySelector('input[name="areaName"]') as HTMLInputElement;
        if (areaNameInput) areaNameInput.focus();
      }, 100);
    }
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
      this.cdr.detectChanges(); // Ensure UI updates
    } catch (error) {
      console.error('Error creating area:', error);
      this.errorMessage = 'Failed to create area. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); // Ensure UI updates
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
    // Only handle click if areas are loaded and there are none
    if (!this.isLoading && this.areasInitialized && this.areas.length === 0) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleAreaForm();
    }
  }

  async verifyCode(): Promise<void> {
    if (this.codeForm.valid && !this.isVerifying) {
      this.isVerifying = true;
      this.errorMessage = null;
      
      // Add timeout for verification process
      const verifyTimeout = setTimeout(() => {
        if (this.isVerifying) {
          console.warn('Verification timed out');
          this.isVerifying = false;
          this.errorMessage = 'Verification timed out. Please try again.';
          this.cdr.detectChanges();
        }
      }, 15000); // 15 second timeout
      
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
            // Clear the timeout since verification succeeded
            clearTimeout(verifyTimeout);
            
            // Store the code for later use
            this.registrationCode = code;
            console.log('Registration code verified:', code);
            
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
            
            // Start areas loading before changing step for better UI experience
            if (!this.areasInitialized) {
              console.log('Areas not initialized, starting load before step change');
              this.loadAreas();
            }
            
            this.currentStep = 1;
            
            // Make sure we have areas loaded before proceeding with the form
            if (!this.areasInitialized) {
              try {
                await this.loadAreasAsync();
              } catch (areaError) {
                console.error('Error loading areas during verification:', areaError);
                // Continue anyway, the error is already displayed to the user
              }
            }
          } else {
            clearTimeout(verifyTimeout);
            throw new Error('Invalid registration code');
          }
        } catch (err) {
          clearTimeout(verifyTimeout);
          console.error('Error checking registration code:', err);
          throw new Error('Invalid registration code or already claimed');
        }
      } catch (error: any) {
        clearTimeout(verifyTimeout);
        console.error('Error verifying code:', error);
        this.errorMessage = error.message || 'Failed to verify registration code';
      } finally {
        // Make sure verifying state is cleared
        this.isVerifying = false;
        this.cdr.detectChanges(); // Ensure UI updates
      }
    }
  }

  // Helper method to load areas as a Promise
  private async loadAreasAsync(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Add timeout to prevent hanging promises
      const loadingTimeout = setTimeout(() => {
        if (this.isLoading) {
          console.warn('Async loading of areas timed out');
          this.isLoading = false;
          this.areasInitialized = true;
          this.errorMessage = 'Loading areas timed out. Please try again.';
          this.cdr.detectChanges();
          // Resolve anyway to prevent hanging
          resolve();
        }
      }, 10000); // 10 second timeout
      
      this.areaService.getAreas().subscribe({
        next: (areas) => {
          clearTimeout(loadingTimeout);
          console.log('Areas loaded successfully (async):', areas.length);
          this.areas = areas;
          this.areasInitialized = true;
          this.isLoading = false;
          
          // If we have areas, select the first one
          if (this.areas.length > 0) {
            this.screenForm.get('area_id')?.setValue(this.areas[0].id);
          }
          
          this.cdr.detectChanges();
          resolve();
        },
        error: (error) => {
          clearTimeout(loadingTimeout);
          console.error('Error loading areas (async):', error);
          this.errorMessage = 'Failed to load areas';
          this.isLoading = false;
          this.areasInitialized = true;
          this.cdr.detectChanges();
          // Resolve instead of reject to prevent hanging
          resolve();
        },
        complete: () => {
          clearTimeout(loadingTimeout);
          this.isLoading = false;
          this.areasInitialized = true;
          this.cdr.detectChanges();
        }
      });
    });
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
        this.cdr.detectChanges();
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

  private loadAreas(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    console.log('🔍 CreateScreenDialog: Loading areas...');
    
    // Add timeout to prevent infinite loading state
    const loadingTimeout = setTimeout(() => {
      if (this.isLoading) {
        console.warn('⚠️ CreateScreenDialog: Loading areas timed out');
        this.isLoading = false;
        this.areasInitialized = true;
        this.errorMessage = 'Loading areas timed out. Please try again.';
        this.cdr.detectChanges();
      }
    }, 10000); // 10 second timeout
    
    // Let's try to directly query Supabase first to verify if data exists
    supabase
      .from('areas')
      .select('*')
      .then(({ data, error }) => {
        console.log('📊 CreateScreenDialog: Direct Supabase areas query result:', { data, error });
        if (error) {
          console.error('❌ CreateScreenDialog: Direct Supabase query error:', error);
        } else {
          console.log(`✅ CreateScreenDialog: Found ${data?.length || 0} areas in direct query`);
        }
      })
    
    // Now use the service as normal
    this.areaService.getAreas(true) // Force refresh to avoid cache issues
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (areas) => {
          clearTimeout(loadingTimeout);
          console.log('✅ CreateScreenDialog: Areas loaded successfully:', areas);
          
          // Check for empty vs undefined/null
          if (!areas) {
            console.warn('⚠️ CreateScreenDialog: Areas is null or undefined');
            this.areas = [];
          } else {
            this.areas = areas;
            console.log('📋 CreateScreenDialog: Areas content:', JSON.stringify(this.areas));
          }
          
          this.isLoading = false;
          this.areasInitialized = true;
          
          // If we have areas, select the first one by default
          if (this.areas && this.areas.length > 0) {
            console.log('🔵 CreateScreenDialog: Setting first area:', this.areas[0]);
            this.screenForm.get('area_id')?.setValue(this.areas[0].id);
            console.log('🔵 CreateScreenDialog: Form value after setting area:', this.screenForm.value);
          } else {
            console.warn('⚠️ CreateScreenDialog: No areas available to select');
          }
          
          // Important: trigger change detection
          this.cdr.detectChanges();
          console.log('🔄 CreateScreenDialog: Change detection triggered');
          
          // Verify the UI state after change detection
          setTimeout(() => {
            console.log('🔍 CreateScreenDialog: Current UI state:', {
              areasLength: this.areas.length,
              formValue: this.screenForm.value,
              isLoading: this.isLoading,
              areasInitialized: this.areasInitialized
            });
            
            // Log the DOM state
            const selectElement = document.querySelector('#areaSelect') as HTMLSelectElement;
            if (selectElement) {
              console.log('🔍 CreateScreenDialog: Select element:', {
                options: selectElement.options.length,
                selectedIndex: selectElement.selectedIndex,
                value: selectElement.value
              });
            } else {
              console.warn('⚠️ CreateScreenDialog: Select element not found in DOM');
            }
          }, 0);
        },
        error: (error) => {
          clearTimeout(loadingTimeout);
          console.error('❌ CreateScreenDialog: Error loading areas:', error);
          this.errorMessage = 'Failed to load areas: ' + (error.message || 'Unknown error');
          this.isLoading = false;
          this.areasInitialized = true; // Still mark as initialized even on error
          this.cdr.detectChanges();
        },
        complete: () => {
          clearTimeout(loadingTimeout);
          console.log('✅ CreateScreenDialog: Areas loading complete');
          this.isLoading = false;
          this.areasInitialized = true;
          this.cdr.detectChanges();
        }
      });
  }

  // Add this method to the CreateScreenDialogComponent to directly query areas
  // This is a last resort fallback if the regular service methods aren't working

  async loadAreasDirectly(): Promise<void> {
    try {
      console.log('🔄 Direct query: Attempting to load areas directly from Supabase');
      this.isLoading = true;
      this.cdr.detectChanges();
      
      // Try first with user filtering
      let { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ Direct query: Error fetching areas with user filtering:', error);
        throw error;
      }
      
      console.log(`✅ Direct query: Found ${data?.length || 0} areas`);
      
      // Map to Area objects manually
      const mappedAreas: Area[] = (data || []).map(item => ({
        id: item.id,
        name: item.name || 'Unnamed Area',
        description: item.description || '',
        location: item.location || 'Unknown Location',
        status: item.status || 'inactive',
        screenCount: item.screen_count || 0,
        lastUpdated: new Date(item.updated_at || Date.now()),
        stats: {
          onlineScreens: 0,
          totalScreens: 0,
          activePlaylist: 'No playlist',
          uptime: '100%',
          lastUpdated: item.updated_at || new Date().toISOString()
        },
        screens: []
      }));
      
      console.log('📋 Direct query: Mapped areas:', mappedAreas);
      
      // Update component state
      this.areas = mappedAreas;
      this.isLoading = false;
      this.areasInitialized = true;
      
      // Select the first area if available
      if (this.areas.length > 0) {
        this.screenForm.get('area_id')?.setValue(this.areas[0].id);
      }
      
      // Update UI
      this.cdr.detectChanges();
      console.log('✅ Direct query: Areas loaded directly and UI updated');
      
    } catch (err) {
      console.error('❌ Direct query: Fatal error loading areas directly:', err);
      this.errorMessage = 'Failed to load areas directly. Please try again.';
      this.isLoading = false;
      this.areasInitialized = true;
      this.cdr.detectChanges();
    }
  }
}