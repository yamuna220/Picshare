import { Component, OnInit } from '@angular/core';
import { Post, PostComment, PaginatedPostsResponse } from '../../../../core/models/post.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiResponse } from '../../../../core/models/api-response.model';

@Component({
  selector: 'app-home-feed',
  templateUrl: './home-feed.component.html',
  styleUrls: ['./home-feed.component.css'],
})
export class HomeFeedComponent implements OnInit {
  posts: Post[] = [];
  isLoading = false;
  errorMessage = '';
  page = 1;
  hasMore = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  get currentUserId(): string {
    return this.authService.currentUserValue?.id || '';
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadFeed();
    }
  }

  loadFeed(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<PaginatedPostsResponse>>('/posts/feed', {
        page: this.page,
        limit: 10,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.data) {
            this.posts =
              this.page === 1 ? res.data.posts : [...this.posts, ...res.data.posts];
            this.hasMore = res.data.hasMore;
          }
        },
        error: (err: { message?: string }) => {
          this.isLoading = false;
          this.errorMessage = err?.message || 'Could not load feed.';
        },
      });
  }

  onToggleLike(postId: string): void {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) {
      return;
    }

    const req$ = post.isLikedByCurrentUser
      ? this.apiService.delete<ApiResponse<{ likesCount: number; isLikedByCurrentUser: boolean }>>(
          `/posts/${postId}/like`
        )
      : this.apiService.post<ApiResponse<{ likesCount: number; isLikedByCurrentUser: boolean }>>(
          `/posts/${postId}/like`,
          {}
        );

    req$.subscribe({
      next: (res) => {
        if (res.data) {
          post.likesCount = res.data.likesCount;
          post.isLikedByCurrentUser = res.data.isLikedByCurrentUser;
        }
      },
      error: (err: { message?: string }) => {
        this.toastService.error(err?.message || 'Unable to update like.');
      },
    });
  }

  onAddComment(event: { postId: string; text: string }): void {
    const post = this.posts.find((p) => p.id === event.postId);
    if (!post) {
      return;
    }

    this.apiService
      .post<ApiResponse<PostComment & { commentsCount?: number }>>(
        `/posts/${event.postId}/comments`,
        { text: event.text }
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            post.comments = [...(post.comments || []), res.data];
            post.commentsCount =
              typeof res.data.commentsCount === 'number'
                ? res.data.commentsCount
                : post.comments.length;
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
        this.posts = this.posts.filter((p) => p.id !== postId);
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.postsCount > 0) {
          this.authService.updateStoredUser({
            ...currentUser,
            postsCount: currentUser.postsCount - 1,
          });
        }
        this.toastService.success('Post deleted.');
      },
      error: (err: { message?: string }) => {
        this.toastService.error(err?.message || 'Unable to delete post.');
      },
    });
  }
}
