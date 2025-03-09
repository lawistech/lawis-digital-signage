import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { catchError, EMPTY, Observable, retry, tap } from 'rxjs';
import { environment } from '../../../../environment/environment';
import { AreaStateService } from './area-state.service';
import { Area } from '../../../models/area.model';

export interface AreaWebSocketMessage {
  type: 'area_update' | 'area_delete' | 'screen_update';
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class AreaWebSocketService {
  private socket$: WebSocketSubject<AreaWebSocketMessage>;
  private wsUrl = `${environment.wsUrl}/areas`;

  constructor(private areaState: AreaStateService) {
    this.socket$ = this.getNewWebSocket();
    this.setupSocketConnection();
  }

  private getNewWebSocket(): WebSocketSubject<AreaWebSocketMessage> {
    return webSocket({
      url: this.wsUrl,
      openObserver: {
        next: () => {
          console.log('WebSocket connection established');
        }
      },
      closeObserver: {
        next: () => {
          console.log('WebSocket connection closed');
          this.retryConnection();
        }
      }
    });
  }

  private setupSocketConnection(): void {
    this.socket$.pipe(
      tap(message => this.handleMessage(message)),
      catchError(error => {
        console.error('WebSocket error:', error);
        return EMPTY;
      }),
      retry({ count: 5, delay: 1000 })
    ).subscribe();
  }

  private handleMessage(message: AreaWebSocketMessage): void {
    switch (message.type) {
      case 'area_update':
        this.handleAreaUpdate(message.payload);
        break;
      case 'area_delete':
        this.handleAreaDelete(message.payload);
        break;
      case 'screen_update':
        this.handleScreenUpdate(message.payload);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleAreaUpdate(area: Area): void {
    this.areaState.updateArea(area.id, area);
  }

  private handleAreaDelete(areaId: string): void {
    this.areaState.removeArea(areaId);
  }

  private handleScreenUpdate(payload: { areaId: string; screen: any }): void {
    const area = this.areaState.getAreaById(payload.areaId);
    if (area) {
      const updatedScreens = area.screens.map(screen => 
        screen.id === payload.screen.id ? { ...screen, ...payload.screen } : screen
      );
      this.areaState.updateArea(area.id, { screens: updatedScreens });
    }
  }

  private retryConnection(): void {
    setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.socket$ = this.getNewWebSocket();
      this.setupSocketConnection();
    }, 1000);
  }

  // Send updates to the server
  sendAreaUpdate(area: Area): void {
    this.socket$.next({
      type: 'area_update',
      payload: area
    });
  }

  sendScreenUpdate(areaId: string, screen: any): void {
    this.socket$.next({
      type: 'screen_update',
      payload: { areaId, screen }
    });
  }

  // Clean up
  disconnect(): void {
    this.socket$.complete();
  }
}