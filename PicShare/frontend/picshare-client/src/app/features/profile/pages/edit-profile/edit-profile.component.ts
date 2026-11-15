import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { User } from '../../../../core/models/user.model';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css'],
})
export class EditProfileComponent implements OnInit {
  editForm: FormGroup;
  selectedAvatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;
  currentUsername = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiService: ApiService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.editForm = this.fb.group({
      displayName: ['', [Validators.maxLength(50)]],
      bio: ['', [Validators.maxLength(150)]],
      isPrivate: [false],
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUsername = user.username;
      this.avatarPreviewUrl = user.profilePicture || null;
      this.editForm.patchValue({
        displayName: user.displayName || '',
        bio: user.bio || '',
        isPrivate: Boolean(user.isPrivate),
      });
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.errorMessage = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      this.errorMessage = 'Profile picture must be a JPG, JPEG, or PNG image.';
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      this.errorMessage = 'Profile picture must not exceed 5 MB.';
      return;
    }

    this.selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('displayName', this.editForm.value.displayName || '');
    formData.append('bio', this.editForm.value.bio || '');
    formData.append('isPrivate', String(this.editForm.value.isPrivate));
    if (this.selectedAvatarFile) {
      formData.append('profilePicture', this.selectedAvatarFile);
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.apiService.put<ApiResponse<User>>('/users/me', formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.data) {
          this.authService.updateStoredUser(res.data);
        }
        this.toastService.success('Profile updated.');
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.message || 'Unable to update profile.';
      },
    });
  }
}
