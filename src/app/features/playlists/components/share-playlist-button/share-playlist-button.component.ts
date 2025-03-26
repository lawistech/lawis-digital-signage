// src/app/features/playlists/components/share-playlist-button/share-playlist-button.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-playlist-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="copyPublicLink()"
      class="px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-lg transition-colors"
      [class.bg-gray-50]="!copied"
      [class.text-gray-600]="!copied"
      [class.hover:bg-gray-100]="!copied"
      [class.bg-green-50]="copied"
      [class.text-green-600]="copied"
      title="Copy public preview link"
    >
      <span class="material-icons text-sm">
        {{ copied ? 'check_circle' : 'share' }}
      </span>
      {{ copied ? 'Link copied' : 'Share' }}
    </button>
  `
})
export class SharePlaylistButtonComponent {
  @Input() playlistId!: string;
  
  copied = false;
  private copyTimeout: any;

  copyPublicLink(): void {
    if (!this.playlistId) return;

    // Create the public preview URL
    const baseUrl = window.location.origin;
    const publicLink = `${baseUrl}/preview/${this.playlistId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(publicLink).then(() => {
      this.copied = true;
      
      // Reset after 2 seconds
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      
      this.copyTimeout = setTimeout(() => {
        this.copied = false;
      }, 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      // Fallback for browsers that don't support clipboard API
      this.fallbackCopyTextToClipboard(publicLink);
    });
  }

  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.copied = true;
      
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      
      this.copyTimeout = setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (err) {
      console.error('Fallback: Could not copy text: ', err);
      alert(`Copy this link manually: ${text}`);
    }
    
    document.body.removeChild(textArea);
  }
}