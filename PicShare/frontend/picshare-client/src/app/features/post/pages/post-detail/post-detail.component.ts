import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { Post, PostComment } from '../../../../core/models/post.model';

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css'],
})
export class PostDetailComponent implements OnInit {
  postId = '';
  post: Post | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  get currentUserId(): string {
    return this.authService.currentUserValue?.id || '';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.postId = params.get('id') || '';
      if (this.postId) {
        this.loadPost(this.postId);
      }
    });
  }

  loadPost(postId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Post>>(`/posts/${postId}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.post = res.data || null;
      },
      error: (err: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Unable to load photograph.';
      },
    });
  }

  onToggleLike(postId: string): void {
    if (!this.post) {
      return;
    }

    const req$ = this.post.isLikedByCurrentUser
      ? this.apiService.delete<ApiResponse<{ likesCount: number; isLikedByCurrentUser: boolean }>>(
          `/posts/${postId}/like`
        )
      : this.apiService.post<ApiResponse<{ likesCount: number; isLikedByCurrentUser: boolean }>>(
          `/posts/${postId}/like`,
          {}
        );

    req$.subscribe({
      next: (res) => {
        if (this.post && res.data) {
          this.post.likesCount = res.data.likesCount;
          this.post.isLikedByCurrentUser = res.data.isLikedByCurrentUser;
        }
      },
      error: (err: { message?: string }) => {
        this.toastService.error(err?.message || 'Unable to update like.');
      },
    });
  }

  onAddComment(event: { postId: string; text: string }): void {
    if (!this.post) {
      return;
    }

    this.apiService
      .post<ApiResponse<PostComment & { commentsCount?: number }>>(
        `/posts/${event.postId}/comments`,
        { text: event.text }
      )
      .subscribe({
        next: (res) => {
          if (this.post && res.data) {
            this.post.comments = [...(this.post.comments || []), res.data];
            this.post.commentsCount =
              typeof res.data.commentsCount === 'number'
                ? res.data.commentsCount
                : this.post.comments.length;
          }
        },
        error: (err: { message?: string }) => {
          this.toastService.error(err?.message || 'Unable to add comment.');
        },
      });
  }

  onDeletePost(postId: string): void {
    this.apiService.delete<ApiResponse<null>>(`/posts/${postId}`).subscribe({
      next: () => {
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.postsCount > 0) {
          this.authService.updateStoredUser({
            ...currentUser,
            postsCount: currentUser.postsCount - 1,
          });
        }
        this.toastService.success('Post deleted.');
        this.router.navigate(['/profile']);
      },
      error: (err: { message?: string }) => {
        this.toastService.error(err?.message || 'Unable to delete post.');
      },
    });
  }
}
