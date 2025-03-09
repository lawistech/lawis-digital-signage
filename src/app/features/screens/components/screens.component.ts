import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Screen, CreateScreenDto, ScreenFilters } from '../../../models/screen.model';
import { ScreenService } from '../services/screen.service';
import { ScreenCardComponent } from './screen-card/screen-card.component';
import { ScreenTableComponent } from './screen-table/screen-table.component';
import { CreateScreenDialogComponent } from './create-screen-dialog/create-screen-dialog.component';

interface ScreenStats {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  error: number;
}

@Component({
  selector: 'app-screens',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScreenCardComponent,
    ScreenTableComponent,
    CreateScreenDialogComponent,
  ],
  templateUrl: './screens.component.html',
})
export class ScreensComponent implements OnInit {
  screens: Screen[] = [];
  filteredScreens: Screen[] = [];
  loading = true;
  viewMode: 'grid' | 'list' = 'grid';
  searchQuery = '';
  showCreateDialog = false;
  selectedScreen: Screen | null = null;

  // Mock data for channels and areas (replace with actual data service)
  channels = [
    { id: 'ch1', name: 'Main Channel' },
    { id: 'ch2', name: 'Secondary Channel' },
  ];
  
  areas = [
    { id: 'area1', name: 'Main Area' },
    { id: 'area2', name: 'Secondary Area' },
  ];

  filters: ScreenFilters = {
    areaId: '',
    status: '',
  };

  constructor(
    private screenService: ScreenService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadScreens();
  }

  get screensByStatus(): ScreenStats {
    return {
      total: this.screens.length,
      online: this.screens.filter(s => s.status === 'online').length,
      offline: this.screens.filter(s => s.status === 'offline').length,
      maintenance: this.screens.filter(s => s.status === 'maintenance').length,
      error: this.screens.filter(s => s.status === 'error').length,
    };
  }

  loadScreens(): void {
    this.loading = true;
    this.screenService.getScreens().subscribe({
      next: (screens) => {
        this.screens = screens;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading screens:', error);
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    const searchTerm = this.searchQuery.toLowerCase();
    this.filteredScreens = this.screens.filter((screen) => {
      const matchesSearch =
        !searchTerm ||
        screen.name.toLowerCase().includes(searchTerm) ||
        screen.channel_name.toLowerCase().includes(searchTerm);

      const matchesArea = !this.filters.areaId || screen.area_id === this.filters.areaId;
      const matchesStatus = !this.filters.status || screen.status === this.filters.status;

      return matchesSearch && matchesArea && matchesStatus;
    });
  }

  openCreateDialog(): void {
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
  }

  handleCreateScreen(): void {
    this.closeCreateDialog();
    this.loadScreens();
   
  }

  editScreen(screen: Screen): void {
    // Implement edit functionality
    console.log('Edit screen:', screen);
  }

  viewScreenDetails(screen: Screen): void {
    this.router.navigate(['/screens', screen.id]);
  }

  confirmDelete(screen: Screen): void {
    if (confirm(`Are you sure you want to delete ${screen.name}?`)) {
      this.screenService.deleteScreen(screen.id).subscribe({
        next: () => {
          this.screens = this.screens.filter((s) => s.id !== screen.id);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error deleting screen:', error);
        },
      });
    }
  }
}