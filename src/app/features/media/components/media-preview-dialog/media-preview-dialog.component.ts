// media-preview-dialog.component.ts
import { 
    Component, 
    Input, 
    Output, 
    EventEmitter, 
    ViewChild, 
    ElementRef, 
    AfterViewInit,
    HostListener
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Media } from '../../../../models/media.model';
  
  @Component({
    selector: 'app-media-preview-dialog',
    standalone: true,
    imports: [CommonModule],
    templateUrl:"./media-preview-dialog.component.html",
    styles: [`
      :host {
        display: block;
      }
  
      .material-icons {
        font-size: 20px;
        line-height: 1;
        display: block;
      }
    `]
  })
  export class MediaPreviewDialogComponent implements AfterViewInit {
    @Input({ required: true }) media!: Media;
    @Output() close = new EventEmitter<void>();
    @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;
  
    // State
    scale = 1;
    maxZoom = 4;
    position = { x: 0, y: 0 };
    isZoomed = false;
    isLoading = true;
    hasError = false;
    isClosing = false;
    showControls = true;
    isHovering = false;
    isFullscreen = false;
    controlsTimeout?: number;
    Math = Math;
  
    // Dragging state
    isDragging = false;
    isDraggable = false;
    dragStart = { x: 0, y: 0 };
  
    ngAfterViewInit() {
      if (this.media.type === 'video' && this.videoPlayer) {
        const playPromise = this.videoPlayer.nativeElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Autoplay prevented:', error);
          });
        }
      }
  
      // Hide controls after 3 seconds
      this.resetControlsTimer();
    }
  
    // Keyboard shortcuts
    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          this.initiateClose();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
        case 'r':
        case 'R':
          this.resetView();
          break;
        case '+':
        case '=':
          this.zoomIn();
          break;
        case '-':
        case '_':
          this.zoomOut();
          break;
      }
    }
  
    // Mouse handlers
    @HostListener('mousemove')
    onMouseMove() {
      this.showControls = true;
      this.resetControlsTimer();
    }
  
    startDrag(event: MouseEvent) {
      if (this.scale > 1) {
        this.isDragging = true;
        this.dragStart = {
          x: event.clientX - this.position.x,
          y: event.clientY - this.position.y
        };
        event.preventDefault();
      }
    }
  
    handleDrag(event: MouseEvent) {
      if (this.isDragging) {
        this.position = {
          x: event.clientX - this.dragStart.x,
          y: event.clientY - this.dragStart.y
        };
        event.preventDefault();
      }
    }
  
    stopDrag() {
      this.isDragging = false;
    }
  
    handleContentClick(event: MouseEvent) {
      if (!this.isDragging) {
        this.toggleZoom(event);
      }
    }
  
    handleWheel(event: WheelEvent) {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        const delta = -Math.sign(event.deltaY) * 0.25;
        const newScale = Math.max(1, Math.min(this.maxZoom, this.scale + delta));
        
        if (newScale !== this.scale) {
          // Calculate cursor position relative to image
          const rect = target.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
    
          // Calculate new position to zoom towards cursor
          const scaleChange = newScale / this.scale;
          this.position = {
            x: x - (x - this.position.x) * scaleChange,
            y: y - (y - this.position.y) * scaleChange
          };
    
          this.scale = newScale;
          this.isZoomed = this.scale > 1;
          this.isDraggable = this.isZoomed;
        }
    }
  
    handleBackdropClick(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        this.initiateClose();
      }
    }
  
    // Media handlers
    onMediaLoaded() {
      this.isLoading = false;
      this.hasError = false;
    }
  
    onMediaError() {
      this.isLoading = false;
      this.hasError = true;
    }
  
    retryLoad() {
      this.isLoading = true;
      this.hasError = false;
      // Force reload by updating the src
      if (this.media.type === 'video' && this.videoPlayer) {
        this.videoPlayer.nativeElement.load();
      }
    }
  
    // View controls
    toggleZoom(event: MouseEvent) {
      event.stopPropagation();
      if (this.isZoomed) {
        this.resetView();
      } else {
        this.scale = 2;
        this.isZoomed = true;
        this.isDraggable = true;
      }
    }
  
    zoomIn() {
      this.scale = Math.min(this.scale + 0.5, this.maxZoom);
      this.isZoomed = this.scale > 1;
      this.isDraggable = this.isZoomed;
    }
  
    zoomOut() {
      this.scale = Math.max(this.scale - 0.5, 1);
      this.isZoomed = this.scale > 1;
      this.isDraggable = this.isZoomed;
      if (this.scale === 1) {
        this.position = { x: 0, y: 0 };
      }
    }
  
    resetView() {
      this.scale = 1;
      this.position = { x: 0, y: 0 };
      this.isZoomed = false;
      this.isDraggable = false;
    }
  
    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
      if (this.isFullscreen) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  
    // Utility methods
    getTransform(): string {
      return `translate(${this.position.x}px, ${this.position.y}px) scale(${this.scale})`;
    }
  
    get isTransformed(): boolean {
      return this.scale !== 1 || this.position.x !== 0 || this.position.y !== 0;
    }
  
    formatFileSize(bytes: number | undefined): string {
      if (!bytes) return '';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
    }
  
    formatDuration(seconds: number | undefined): string {
      if (!seconds) return '';
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  
    // Control visibility
    private resetControlsTimer() {
      if (this.controlsTimeout) {
        window.clearTimeout(this.controlsTimeout);
      }
      this.controlsTimeout = window.setTimeout(() => {
        if (!this.isHovering) {
          this.showControls = false;
        }
      }, 3000);
    }
  
    // Close handling
    initiateClose() {
      this.isClosing = true;
      setTimeout(() => {
        this.close.emit();
      }, 200);
    }
  
    // Cleanup
    ngOnDestroy() {
      if (this.controlsTimeout) {
        window.clearTimeout(this.controlsTimeout);
      }
      if (this.isFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }