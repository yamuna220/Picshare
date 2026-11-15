import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { User } from '../../../../core/models/user.model';
import { Post } from '../../../../core/models/post.model';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css'],
})
export class MyProfileComponent implements OnInit {
  user: User | null = null;
  posts: Post[] = [];
  isLoading = false;
  errorMessage = '';
  readonly pendingRequestsCount$: Observable<number>;

  selectedAvatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;
  isUploadingAvatar = false;
  avatarUploadError = '';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private toastService: ToastService
  ) {
    this.pendingRequestsCount$ = this.notificationService.pendingRequestsCount$;
  }

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    if (this.authService.isAuthenticated()) {
      this.loadProfile();
    }
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<{ user: User; posts: Post[] }>>('/users/me').subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data) {
          this.user = res.data.user;
          this.posts = res.data.posts || [];
          this.authService.updateStoredUser(res.data.user);
        }
      },
      error: (err: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load profile details.';
      },
    });
  }

  onProfilePictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.avatarUploadError = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      this.avatarUploadError = 'Profile picture must be a JPG, JPEG, or PNG image.';
      this.cancelAvatarSelection();
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      this.avatarUploadError = 'Profile picture must not exceed 5 MB.';
      this.cancelAvatarSelection();
      return;
    }

    this.selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  cancelAvatarSelection(): void {
    this.selectedAvatarFile = null;
    this.avatarPreviewUrl = null;
  }

  onUploadProfilePicture(): void {
    if (!this.selectedAvatarFile) {
      this.avatarUploadError = 'Please select an image file first.';
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', this.selectedAvatarFile);

    this.isUploadingAvatar = true;
    this.avatarUploadError = '';

    this.apiService
      .put<ApiResponse<User>>('/users/me/profile-picture', formData)
      .subscribe({
        next: (res) => {
          this.isUploadingAvatar = false;
          if (res.data) {
            this.user = res.data;
            this.authService.updateStoredUser(res.data);
          }
          this.cancelAvatarSelection();
          this.toastService.success('Profile picture updated.');
        },
        error: (err: { message?: string }) => {
          this.isUploadingAvatar = false;
          this.avatarUploadError =
            err?.message || 'Unable to upload profile picture.';
        },
      });
  }
}
