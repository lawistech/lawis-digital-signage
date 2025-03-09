// websocket.service.ts
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../../environment/environment';
import { StateService } from './state.service';
import { Observable, Subject } from 'rxjs';

export interface WebSocketMessage {
  type: 'screen_update' | 'playlist_update' | 'area_update';
  payload: any;
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$: WebSocketSubject<WebSocketMessage>;
  private messageSubject = new Subject<WebSocketMessage>();
  public messages$ = this.messageSubject.asObservable();

  constructor(private state: StateService) {
    this.socket$ = webSocket(environment.wsUrl);
    this.setupSocketConnection();
  }

  private setupSocketConnection(): void {
    this.socket$.subscribe({
      next: (message) => {
        this.handleMessage(message);
        this.messageSubject.next(message); // Forward message to subscribers
      },
      error: (error) => console.error('WebSocket error:', error),
      complete: () => console.log('WebSocket connection closed'),
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'screen_update':
        this.state.updateScreen(message.payload.id, message.payload);
        break;
      case 'playlist_update':
        this.state.updatePlaylist(message.payload.id, message.payload);
        break;
      case 'area_update':
        this.state.updateArea(message.payload.id, message.payload);
        break;
    }
  }

  sendMessage(message: WebSocketMessage): void {
    this.socket$.next(message);
  }
}