import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Playlist, PlaylistItem } from '../../../../models/playlist.model';

@Component({
  selector: 'app-playlist-preview-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playlist-preview-dialog.component.html',
  styleUrl: './playlist-preview-dialog.component.scss',
})
export class PlaylistPreviewDialogComponent implements OnInit, OnDestroy {
  @Input({ required: true }) playlist!: Playlist;
  @Output() closeDialog = new EventEmitter<void>();
  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;

  currentIndex = 0;
  currentItem: PlaylistItem | null = null;
  progress = 0;
  isTransitioning = false;
  private timer: any = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (this.playlist.items.length > 0) {
      this.startPlayback();
    } else {
      this.close();
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private startPlayback() {
    this.currentItem = this.playlist.items[this.currentIndex];
    this.progress = 0;
    this.isTransitioning = true;

    setTimeout(() => {
      this.isTransitioning = false;
      if (this.currentItem?.type === 'video' && this.videoPlayer) {
        this.videoPlayer.nativeElement.play().catch(console.error);
      } else if (this.currentItem) {
        const duration =
          this.currentItem.duration || this.playlist.settings.defaultDuration;
        this.startTimer(duration * 1000);
      }
    }, this.currentItem?.settings.transitionDuration || 500);
  }

  private startTimer(duration: number) {
    let startTime = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.progress = (elapsed / duration) * 100;

      if (elapsed >= duration) {
        this.nextItem();
      }
    }, 100);
  }

  private nextItem() {
    this.clearTimer();
    this.currentIndex = (this.currentIndex + 1) % this.playlist.items.length;

    if (this.currentIndex === 0 && !this.playlist.settings.loop) {
      this.close();
      return;
    }

    this.startPlayback();
  }

  onVideoEnded() {
    if (this.currentItem && !this.currentItem.settings.loop) {
      this.nextItem();
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  close() {
    this.clearTimer();
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.pause();
    }
    this.closeDialog.emit();
  }

  getScalingClass(scaling?: 'fit' | 'fill' | 'stretch'): string {
    switch (scaling) {
      case 'fill':
        return 'w-full h-full object-cover';
      case 'stretch':
        return 'w-full h-full object-fill';
      default:
        return 'w-full h-full object-contain';
    }
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
