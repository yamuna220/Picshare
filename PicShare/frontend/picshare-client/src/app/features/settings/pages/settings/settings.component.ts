import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { User } from '../../../../core/models/user.model';

function matchNewPasswords(control: AbstractControl): ValidationErrors | null {
  const next = control.get('newPassword')?.value;
  const confirm = control.get('confirmNewPassword')?.value;
  if (!next || !confirm) {
    return null;
  }
  return next === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  user: User | null = null;
  isPrivate = false;
  isUpdatingPrivacy = false;
  privacyError = '';

  passwordForm: FormGroup;
  isUpdatingPassword = false;
  passwordError = '';
  passwordSuccess = '';

  showDeleteModal = false;
  deleteConfirmUsername = '';
  deletePassword = '';
  isDeletingAccount = false;
  deleteError = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmNewPassword: ['', [Validators.required]],
      },
      { validators: matchNewPasswords }
    );
  }

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.isPrivate = Boolean(this.user?.isPrivate);

    if (this.authService.isAuthenticated()) {
      this.authService.refreshCurrentUser().subscribe({
        next: (res) => {
          if (res.data?.user) {
            this.user = res.data.user;
            this.isPrivate = Boolean(res.data.user.isPrivate);
          }
        },
        error: () => {
          // Handled centrally if unauthorized
        },
      });
    }
  }

  onPrivacyToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.isUpdatingPrivacy) {
      input.checked = this.isPrivate;
      return;
    }

    const nextPrivacy = input.checked;
    // Hold UI checkbox at the persisted value until the backend confirms persistence
    input.checked = this.isPrivate;

    this.isUpdatingPrivacy = true;
    this.privacyError = '';

    this.apiService
      .put<ApiResponse<User>>('/users/me', { isPrivate: nextPrivacy })
      .subscribe({
        next: (res) => {
          this.isUpdatingPrivacy = false;
          if (res.data) {
            this.user = res.data;
            this.isPrivate = Boolean(res.data.isPrivate);
            this.authService.updateStoredUser(res.data);
          } else {
            this.isPrivate = nextPrivacy;
          }
          input.checked = this.isPrivate;
          this.toastService.success(
            this.isPrivate
              ? 'Account privacy set to Private.'
              : 'Account privacy set to Public.'
          );
        },
        error: (err: { message?: string }) => {
          this.isUpdatingPrivacy = false;
          input.checked = this.isPrivate;
          this.privacyError = err?.message || 'Unable to update account privacy.';
          this.toastService.error(this.privacyError);
        },
      });
  }

  onChangePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isUpdatingPassword = true;
    const payload = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmNewPassword: this.passwordForm.value.confirmNewPassword,
    };

    this.apiService.put<ApiResponse<null>>('/auth/password', payload).subscribe({
      next: (res) => {
        this.isUpdatingPassword = false;
        this.passwordForm.reset();
        this.passwordSuccess = res.message || 'Password updated successfully.';
        this.toastService.success(this.passwordSuccess);
      },
      error: (err: { message?: string }) => {
        this.isUpdatingPassword = false;
        this.passwordError = err?.message || 'Unable to update password.';
      },
    });
  }

  onLogout(): void {
    this.notificationService.clearCounts();
    this.authService.logout(true);
    this.toastService.info('You have been logged out.');
  }

  openDeleteModal(): void {
    this.deleteConfirmUsername = '';
    this.deletePassword = '';
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.isDeletingAccount) {
      return;
    }
    this.showDeleteModal = false;
    this.deleteError = '';
  }

  onConfirmDeleteAccount(): void {
    this.deleteError = '';
    const expectedUsername = (this.user?.username || '').toLowerCase();
    const typedUsername = this.deleteConfirmUsername.trim().toLowerCase();

    if (!typedUsername || typedUsername !== expectedUsername) {
      this.deleteError = 'Please type your exact username to confirm deletion.';
      return;
    }

    if (!this.deletePassword) {
      this.deleteError = 'Please enter your current password to confirm.';
      return;
    }

    this.isDeletingAccount = true;
    this.apiService
      .delete<ApiResponse<null>>('/users/me', { password: this.deletePassword })
      .subscribe({
        next: () => {
          this.isDeletingAccount = false;
          this.showDeleteModal = false;
          this.notificationService.clearCounts();
          this.authService.logout(false);
          this.toastService.info('Your account has been permanently deleted.');
          this.router.navigate(['/register']);
        },
        error: (err: { message?: string }) => {
          this.isDeletingAccount = false;
          this.deleteError = err?.message || 'Unable to delete account.';
        },
      });
  }
}
