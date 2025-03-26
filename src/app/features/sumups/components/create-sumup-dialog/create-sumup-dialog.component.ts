// src/app/features/sumups/components/create-sumup-dialog/create-sumup-dialog.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SumupService } from '../../services/sumup.service';

@Component({
  selector: 'app-create-sumup-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-sumup-dialog.component.html',
})
export class CreateSumupDialogComponent {
  @Output() onCreate = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  sumupForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private sumupService: SumupService
  ) {
    this.sumupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['draft']
    });
  }

  handleSubmit(): void {
    if (this.sumupForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.error = null;

      this.sumupService.createSumup({
        name: this.sumupForm.value.name,
        description: this.sumupForm.value.description,
        status: this.sumupForm.value.status,
        playlist_ids: []
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.onCreate.emit();
        },
        error: (error) => {
          console.error('Error creating sumup:', error);
          this.error = 'Failed to create sumup. Please try again.';
          this.isSubmitting = false;
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.sumupForm.controls).forEach(key => {
        this.sumupForm.get(key)?.markAsTouched();
      });
    }
  }
}