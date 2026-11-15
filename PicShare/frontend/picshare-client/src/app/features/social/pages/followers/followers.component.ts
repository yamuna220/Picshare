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
  selector: 'app-followers',
  templateUrl: './followers.component.html',
  styleUrls: ['./followers.component.css'],
})
export class FollowersComponent implements OnInit {
  username = '';
  isOwnList = false;
  followers: UserProfile[] = [];
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
      this.loadFollowers();
    });
  }

  loadFollowers(): void {
    const endpoint = this.username
      ? `/follows/${this.username}/followers`
      : '/follows/me/followers';

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<UserProfile[]>>(endpoint).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.followers = res.data || [];
      },
      error: (err: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load followers.';
      },
    });
  }

  getFollowLabel(user: UserProfile): string {
    if (user.followStatus === 'accepted') {
      return 'Following';
    }
    if (user.followStatus === 'pending') {
      return 'Requested';
    }
    if (user.isFollowingViewer) {
      return 'Follow back';
    }
    return 'Follow';
  }

  onToggleFollow(user: UserProfile): void {
    if (this.busyUserIds.has(user.id)) {
      return;
    }

    const isUnfollowOrCancel =
      user.followStatus === 'accepted' || user.followStatus === 'pending';

    this.busyUserIds.add(user.id);

    const req$ = isUnfollowOrCancel
      ? this.apiService.delete<ApiResponse<FollowActionResponse>>(`/follows/${user.id}`)
      : this.apiService.post<ApiResponse<FollowActionResponse>>(`/follows/${user.id}`, {});

    req$.subscribe({
      next: (res) => {
        this.busyUserIds.delete(user.id);
        if (res.data) {
          user.followStatus = res.data.followStatus;
          user.isFollowingViewer = res.data.isFollowingViewer;

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
        this.busyUserIds.delete(user.id);
        this.toastService.error(err?.message || 'Unable to update follow status.');
      },
    });
  }

  onRemoveFollower(userId: string): void {
    if (this.busyUserIds.has(userId)) {
      return;
    }

    this.busyUserIds.add(userId);
    this.apiService
      .delete<ApiResponse<{ followersCount: number }>>(`/follows/followers/${userId}`)
      .subscribe({
        next: (res) => {
          this.busyUserIds.delete(userId);
          this.followers = this.followers.filter((f) => f.id !== userId);

          const currentUser = this.authService.currentUserValue;
          if (currentUser && res.data && typeof res.data.followersCount === 'number') {
            this.authService.updateStoredUser({
              ...currentUser,
              followersCount: res.data.followersCount,
            });
          }
          this.toastService.success('Follower removed.');
        },
        error: (err: { message?: string }) => {
          this.busyUserIds.delete(userId);
          this.toastService.error(err?.message || 'Unable to remove follower.');
        },
      });
  }
}
