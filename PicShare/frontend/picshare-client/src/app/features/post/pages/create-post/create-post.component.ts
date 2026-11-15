import { Component, ElementRef, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { Post } from '../../../../core/models/post.model';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css'],
})
export class CreatePostComponent {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  caption = '';
  isDragging = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private location: Location
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isSubmitting) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (this.isSubmitting) {
      return;
    }
    const file = event.dataTransfer?.files && event.dataTransfer.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  triggerFilePicker(): void {
    if (this.fileInputRef?.nativeElement && !this.isSubmitting) {
      this.fileInputRef.nativeElement.click();
    }
  }

  private processFile(file: File): void {
    this.errorMessage = '';

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage = 'Only JPG, JPEG, and PNG photographs are supported.';
      this.clearSelectedFile();
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      this.errorMessage = 'Image size must not exceed 5 MB.';
      this.clearSelectedFile();
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  onCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  onPublish(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a photograph before sharing.';
      return;
    }

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('caption', this.caption.trim());

    this.isSubmitting = true;
    this.errorMessage = '';

    this.apiService.post<ApiResponse<Post>>('/posts', formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        const currentUser = this.authService.currentUserValue;
        if (currentUser) {
          this.authService.updateStoredUser({
            ...currentUser,
            postsCount: (currentUser.postsCount || 0) + 1,
          });
        }
        this.toastService.success('Photograph shared.');
        this.router.navigate(['/']);
      },
      error: (err: { message?: string }) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.message || 'Unable to publish photograph. Please try again.';
      },
    });
  }
}
