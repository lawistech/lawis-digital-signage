// src/app/features/sumups/sumups.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Sumup } from '../../models/sumup.model';
import { SumupService } from './services/sumup.service';
import { SumupCardComponent } from './components/sumup-card/sumup-card.component';
import { CreateSumupDialogComponent } from './components/create-sumup-dialog/create-sumup-dialog.component';

@Component({
  selector: 'app-sumups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SumupCardComponent,
    CreateSumupDialogComponent
  ],
  templateUrl: './sumups.component.html',
})
export class SumupsComponent implements OnInit {
  sumups: Sumup[] = [];
  loading = true;
  error: string | null = null;
  searchQuery = '';
  showCreateDialog = false;

  // Stats for the overview
  stats = {
    totalSumups: 0,
    activeSumups: 0,
    lastUpdated: ''
  };

  constructor(
    private sumupService: SumupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSumups();
  }

  loadSumups(): void {
    this.loading = true;
    this.error = null;

    this.sumupService.getSumups().pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (sumups) => {
        this.sumups = sumups;
        this.updateStats();
      },
      error: (error) => {
        console.error('Error loading sumups:', error);
        this.error = 'Failed to load sumups. Please try again.';
      }
    });
  }

  private updateStats(): void {
    this.stats = {
      totalSumups: this.sumups.length,
      activeSumups: this.sumups.filter(p => p.status === 'active').length,
      lastUpdated: this.getLastUpdatedDate()
    };
  }

  private getLastUpdatedDate(): string {
    if (this.sumups.length === 0) return '-';
    const dates = this.sumups.map(p => new Date(p.updated_at));
    const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
    return mostRecent.toLocaleDateString();
  }

  get filteredSumups(): Sumup[] {
    const query = this.searchQuery.toLowerCase();
    return this.sumups.filter(
      (sumup) =>
        sumup.name.toLowerCase().includes(query) ||
        sumup.description?.toLowerCase().includes(query)
    );
  }

  createSumup(): void {
    this.showCreateDialog = true;
  }

  handleCreateSumup(): void {
    this.loadSumups(); // Reload all sumups after creation
    this.showCreateDialog = false;
  }

  editSumup(sumup: Sumup): void {
    this.router.navigate(['/sumups', sumup.id]);
  }

  deleteSumup(sumup: Sumup): void {
    if (confirm(`Are you sure you want to delete "${sumup.name}"?`)) {
      this.sumupService.deleteSumup(sumup.id).subscribe({
        next: () => {
          this.sumups = this.sumups.filter((s) => s.id !== sumup.id);
          this.updateStats();
        },
        error: (error) => {
          console.error('Error deleting sumup:', error);
          // Show error notification
        },
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'draft':
        return 'bg-gray-500';
      case 'inactive':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  }

  // Error handling helper
  handleError(error: any): void {
    console.error('Error:', error);
    // Implement error handling/notification
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const updatedDate = new Date(date);
    const seconds = Math.floor((now.getTime() - updatedDate.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
}