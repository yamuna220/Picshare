import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { FollowRequestItem } from '../../../../core/models/follow.model';
import { AppNotification } from '../../../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent implements OnInit {
  notifications: AppNotification[] = [];
  pendingRequests: FollowRequestItem[] = [];
  isLoading = false;
  isMarkingAll = false;
  markingIds = new Set<string>();
  processingRequestIds = new Set<string>();
  errorMessage = '';

  readonly unreadCount$: Observable<number>;
  readonly pendingRequestsCount$: Observable<number>;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.unreadCount$ = this.notificationService.unreadCount$;
    this.pendingRequestsCount$ = this.notificationService.pendingRequestsCount$;
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadNotifications();
      this.loadPendingRequests();
    }
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.isLoading = false;
        this.notifications = res.data || [];
      },
      error: (err: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load notifications.';
      },
    });
  }

  loadPendingRequests(): void {
    this.apiService.get<ApiResponse<FollowRequestItem[]>>('/follows/requests').subscribe({
      next: (res) => {
        this.pendingRequests = res.data || [];
        this.notificationService.setPendingRequestsCount(this.pendingRequests.length);
      },
      error: () => {
        // Non-blocking fallback: banner remains backed by NotificationService polling
      },
    });
  }

  onAcceptRequest(requestId: string): void {
    if (this.processingRequestIds.has(requestId)) {
      return;
    }
    this.processingRequestIds.add(requestId);

    this.apiService
      .post<ApiResponse<{ requestId: string; followersCount: number }>>(
        `/follows/requests/${requestId}/accept`,
        {}
      )
      .subscribe({
        next: (res) => {
          this.processingRequestIds.delete(requestId);
          this.pendingRequests = this.pendingRequests.filter((r) => r.id !== requestId);
          this.notificationService.setPendingRequestsCount(this.pendingRequests.length);

          const currentUser = this.authService.currentUserValue;
          if (currentUser && res.data && typeof res.data.followersCount === 'number') {
            this.authService.updateStoredUser({
              ...currentUser,
              followersCount: res.data.followersCount,
            });
          }
          this.toastService.success('Follow request accepted.');
        },
        error: (err: { message?: string }) => {
          this.processingRequestIds.delete(requestId);
          this.toastService.error(err?.message || 'Unable to accept follow request.');
        },
      });
  }

  onRejectRequest(requestId: string): void {
    if (this.processingRequestIds.has(requestId)) {
      return;
    }
    this.processingRequestIds.add(requestId);

    this.apiService
      .post<ApiResponse<{ requestId: string }>>(
        `/follows/requests/${requestId}/reject`,
        {}
      )
      .subscribe({
        next: () => {
          this.processingRequestIds.delete(requestId);
          this.pendingRequests = this.pendingRequests.filter((r) => r.id !== requestId);
          this.notificationService.setPendingRequestsCount(this.pendingRequests.length);
          this.toastService.info('Follow request declined.');
        },
        error: (err: { message?: string }) => {
          this.processingRequestIds.delete(requestId);
          this.toastService.error(err?.message || 'Unable to reject follow request.');
        },
      });
  }

  describeNotification(item: AppNotification): string {
    switch (item.type) {
      case 'like':
        return 'liked your photograph.';
      case 'comment':
        return 'commented on your photograph.';
      case 'follow':
        return 'started following you.';
      case 'follow_request':
        return 'requested to follow you.';
      case 'follow_accept':
        return 'accepted your follow request.';
      default:
        return 'interacted with your account.';
    }
  }

  onMarkAsRead(item: AppNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (item.isRead || this.markingIds.has(item.id)) {
      return;
    }

    this.markingIds.add(item.id);
    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        this.markingIds.delete(item.id);
        item.isRead = true;
      },
      error: (err: { message?: string }) => {
        this.markingIds.delete(item.id);
        this.toastService.error(err?.message || 'Unable to mark notification as read.');
      },
    });
  }

  onMarkAllAsRead(): void {
    if (this.isMarkingAll || this.notificationService.unreadCountValue === 0) {
      return;
    }

    this.isMarkingAll = true;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.isMarkingAll = false;
        this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        this.toastService.success('All notifications marked as read.');
      },
      error: (err: { message?: string }) => {
        this.isMarkingAll = false;
        this.toastService.error(err?.message || 'Unable to mark notifications as read.');
      },
    });
  }

  onOpenNotification(item: AppNotification): void {
    if (!item.isRead) {
      this.onMarkAsRead(item);
    }

    if ((item.type === 'like' || item.type === 'comment') && item.postId) {
      this.router.navigate(['/posts', item.postId]);
      return;
    }

    if (item.type === 'follow_request') {
      this.router.navigate(['/requests']);
      return;
    }

    if (item.actor?.username) {
      this.router.navigate(['/users', item.actor.username]);
    }
  }
}
