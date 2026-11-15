import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { UserProfile } from '../../../../core/models/user.model';
import { Post } from '../../../../core/models/post.model';

interface FollowActionResponse {
  followStatus: 'none' | 'pending' | 'accepted';
  isFollowingViewer: boolean;
  followersCount: number;
  followingCount: number;
  canViewPosts: boolean;
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
})
export class UserProfileComponent implements OnInit {
  username = '';
  profile: UserProfile | null = null;
  posts: Post[] = [];
  isLoading = false;
  isFollowSubmitting = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  get followButtonLabel(): string {
    if (!this.profile) {
      return 'Follow';
    }
    if (this.profile.followStatus === 'accepted') {
      return 'Following';
    }
    if (this.profile.followStatus === 'pending') {
      return 'Requested';
    }
    if (this.profile.isFollowingViewer) {
      return 'Follow back';
    }
    return 'Follow';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.username = params.get('username') || '';
      if (!this.username) {
        return;
      }

      const currentUsername = this.authService.currentUserValue?.username;
      if (
        currentUsername &&
        currentUsername.toLowerCase() === this.username.toLowerCase()
      ) {
        this.router.navigate(['/profile'], { replaceUrl: true });
        return;
      }

      this.loadUserProfile(this.username);
    });
  }

  loadUserProfile(username: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<{ user: UserProfile; posts: Post[] }>>(`/users/${username}`)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.data) {
            if (res.data.user.isOwnProfile) {
              this.router.navigate(['/profile'], { replaceUrl: true });
              return;
            }
            this.profile = res.data.user;
            this.posts = res.data.posts || [];
          }
        },
        error: (err: { message?: string }) => {
          this.isLoading = false;
          this.errorMessage =
            err?.message || `Unable to load profile for @${username}.`;
        },
      });
  }

  onFollowAction(): void {
    if (!this.profile || this.isFollowSubmitting) {
      return;
    }

    const targetId = this.profile.id;
    const isUnfollowOrCancel =
      this.profile.followStatus === 'accepted' || this.profile.followStatus === 'pending';

    this.isFollowSubmitting = true;

    const req$ = isUnfollowOrCancel
      ? this.apiService.delete<ApiResponse<FollowActionResponse>>(`/follows/${targetId}`)
      : this.apiService.post<ApiResponse<FollowActionResponse>>(`/follows/${targetId}`, {});

    req$.subscribe({
      next: (res) => {
        this.isFollowSubmitting = false;
        if (!this.profile || !res.data) {
          return;
        }

        const prevCanView = Boolean(this.profile.canViewPosts);
        this.profile = {
          ...this.profile,
          followStatus: res.data.followStatus,
          isFollowingViewer: res.data.isFollowingViewer,
          followersCount: res.data.followersCount,
          canViewPosts: res.data.canViewPosts,
        };

        const currentUser = this.authService.currentUserValue;
        if (currentUser && typeof res.data.followingCount === 'number') {
          this.authService.updateStoredUser({
            ...currentUser,
            followingCount: res.data.followingCount,
          });
        }

        if (!res.data.canViewPosts) {
          this.posts = [];
        } else if (!prevCanView && res.data.canViewPosts) {
          this.loadUserProfile(this.profile.username);
        }
      },
      error: (err: { message?: string }) => {
        this.isFollowSubmitting = false;
        this.toastService.error(err?.message || 'Unable to update follow status.');
      },
    });
  }
}
