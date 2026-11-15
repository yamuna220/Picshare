import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { UserProfile } from '../../../../core/models/user.model';

interface FollowActionResponse {
  followStatus: 'none' | 'pending' | 'accepted';
  isFollowingViewer: boolean;
  followingCount: number;
}

@Component({
  selector: 'app-following',
  templateUrl: './following.component.html',
  styleUrls: ['./following.component.css'],
})
export class FollowingComponent implements OnInit {
  username = '';
  isOwnList = false;
  following: UserProfile[] = [];
  isLoading = false;
  errorMessage = '';
  busyUserIds = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.username = params.get('username') || '';
      const currentUsername = this.authService.currentUserValue?.username || '';
      this.isOwnList =
        !this.username ||
        (Boolean(currentUsername) &&
          this.username.toLowerCase() === currentUsername.toLowerCase());
      this.loadFollowing();
    });
  }

  loadFollowing(): void {
    const endpoint = this.username
      ? `/follows/${this.username}/following`
      : '/follows/me/following';

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<UserProfile[]>>(endpoint).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.following = res.data || [];
      },
      error: (err: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load following list.';
      },
    });
  }

  getFollowLabel(account: UserProfile): string {
    if (account.followStatus === 'accepted') {
      return 'Following';
    }
    if (account.followStatus === 'pending') {
      return 'Requested';
    }
    if (account.isFollowingViewer) {
      return 'Follow back';
    }
    return 'Follow';
  }

  onToggleFollow(account: UserProfile): void {
    if (this.busyUserIds.has(account.id)) {
      return;
    }

    const isUnfollowOrCancel =
      account.followStatus === 'accepted' || account.followStatus === 'pending';

    this.busyUserIds.add(account.id);

    const req$ = isUnfollowOrCancel
      ? this.apiService.delete<ApiResponse<FollowActionResponse>>(`/follows/${account.id}`)
      : this.apiService.post<ApiResponse<FollowActionResponse>>(`/follows/${account.id}`, {});

    req$.subscribe({
      next: (res) => {
        this.busyUserIds.delete(account.id);
        if (res.data) {
          account.followStatus = res.data.followStatus;
          account.isFollowingViewer = res.data.isFollowingViewer;

          if (this.isOwnList && res.data.followStatus === 'none') {
            this.following = this.following.filter((item) => item.id !== account.id);
          }

          const currentUser = this.authService.currentUserValue;
          if (currentUser && typeof res.data.followingCount === 'number') {
            this.authService.updateStoredUser({
              ...currentUser,
              followingCount: res.data.followingCount,
            });
          }
        }
      },
      error: (err: { message?: string }) => {
        this.busyUserIds.delete(account.id);
        this.toastService.error(err?.message || 'Unable to update follow status.');
      },
    });
  }
}
