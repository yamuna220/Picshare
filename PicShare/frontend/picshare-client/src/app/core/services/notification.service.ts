import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api-response.model';
import { AppNotification } from '../models/notification.model';

export interface NotificationCounts {
  unreadCount: number;
  pendingRequestsCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly pendingRequestsCountSubject = new BehaviorSubject<number>(0);

  readonly unreadCount$ = this.unreadCountSubject.asObservable();
  readonly pendingRequestsCount$ = this.pendingRequestsCountSubject.asObservable();

  constructor(private api: ApiService, private authService: AuthService) {
    this.authService.currentUser$.subscribe((user) => {
      if (!user) {
        this.clearCounts();
      }
    });
  }

  get unreadCountValue(): number {
    return this.unreadCountSubject.value;
  }

  get pendingRequestsCountValue(): number {
    return this.pendingRequestsCountSubject.value;
  }

  refreshCounts(): Observable<ApiResponse<NotificationCounts>> {
    return this.api.get<ApiResponse<NotificationCounts>>('/notifications/unread-count').pipe(
      tap((res) => {
        if (res.data) {
          this.unreadCountSubject.next(res.data.unreadCount || 0);
          this.pendingRequestsCountSubject.next(res.data.pendingRequestsCount || 0);
        }
      })
    );
  }

  getNotifications(): Observable<ApiResponse<AppNotification[]>> {
    return this.api.get<ApiResponse<AppNotification[]>>('/notifications').pipe(
      tap((res) => {
        if (res.meta) {
          if (typeof res.meta.unreadCount === 'number') {
            this.unreadCountSubject.next(res.meta.unreadCount);
          }
          if (typeof res.meta.pendingRequestsCount === 'number') {
            this.pendingRequestsCountSubject.next(res.meta.pendingRequestsCount);
          }
        }
      })
    );
  }

  markAsRead(
    notificationId: string
  ): Observable<ApiResponse<{ notification: AppNotification; unreadCount: number }>> {
    return this.api
      .patch<ApiResponse<{ notification: AppNotification; unreadCount: number }>>(
        `/notifications/${notificationId}/read`,
        {}
      )
      .pipe(
        tap((res) => {
          if (res.data && typeof res.data.unreadCount === 'number') {
            this.unreadCountSubject.next(res.data.unreadCount);
          }
        })
      );
  }

  markAllAsRead(): Observable<ApiResponse<{ unreadCount: number }>> {
    return this.api
      .patch<ApiResponse<{ unreadCount: number }>>('/notifications/read-all', {})
      .pipe(
        tap(() => {
          this.unreadCountSubject.next(0);
        })
      );
  }

  decrementPendingRequests(): void {
    const next = Math.max(0, this.pendingRequestsCountSubject.value - 1);
    this.pendingRequestsCountSubject.next(next);
  }

  setPendingRequestsCount(count: number): void {
    this.pendingRequestsCountSubject.next(Math.max(0, count));
  }

  clearCounts(): void {
    this.unreadCountSubject.next(0);
    this.pendingRequestsCountSubject.next(0);
  }
}
