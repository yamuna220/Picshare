import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { FollowRequestItem } from '../../../../core/models/follow.model';

@Component({
  selector: 'app-follow-requests',
  templateUrl: './follow-requests.component.html',
  styleUrls: ['./follow-requests.component.css'],
})
export class FollowRequestsComponent implements OnInit {
  requests: FollowRequestItem[] = [];
  isLoading = false;
  errorMessage = '';
  processingIds = new Set<string>();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadRequests();
    }
  }

  loadRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<FollowRequestItem[]>>('/follows/requests').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.requests = res.data || [];
        this.notificationService.setPendingRequestsCount(this.requests.length);
      },
      error: (err: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load follow requests.';
      },
    });
  }

  onAccept(requestId: string): void {
    if (this.processingIds.has(requestId)) {
      return;
    }

    this.processingIds.add(requestId);
    this.apiService
      .post<ApiResponse<{ requestId: string; followersCount: number }>>(
        `/follows/requests/${requestId}/accept`,
        {}
      )
      .subscribe({
        next: (res) => {
          this.processingIds.delete(requestId);
          this.requests = this.requests.filter((r) => r.id !== requestId);
          this.notificationService.setPendingRequestsCount(this.requests.length);

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
          this.processingIds.delete(requestId);
          this.toastService.error(err?.message || 'Unable to accept follow request.');
        },
      });
  }

  onReject(requestId: string): void {
    if (this.processingIds.has(requestId)) {
      return;
    }

    this.processingIds.add(requestId);
    this.apiService
      .post<ApiResponse<{ requestId: string }>>(
        `/follows/requests/${requestId}/reject`,
        {}
      )
      .subscribe({
        next: () => {
          this.processingIds.delete(requestId);
          this.requests = this.requests.filter((r) => r.id !== requestId);
          this.notificationService.setPendingRequestsCount(this.requests.length);
          this.toastService.info('Follow request declined.');
        },
        error: (err: { message?: string }) => {
          this.processingIds.delete(requestId);
          this.toastService.error(err?.message || 'Unable to reject follow request.');
        },
      });
  }
}
