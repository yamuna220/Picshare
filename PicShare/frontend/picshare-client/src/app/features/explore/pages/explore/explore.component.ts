import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { PaginatedPostsResponse, Post } from '../../../../core/models/post.model';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css'],
})
export class ExploreComponent implements OnInit {
  posts: Post[] = [];
  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';
  page = 1;
  hasMore = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadExplore(1);
    }
  }

  loadExplore(targetPage: number): void {
    const isInitial = targetPage === 1;
    if (isInitial) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<PaginatedPostsResponse>>('/posts/explore', {
        page: targetPage,
        limit: 24,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.isLoadingMore = false;
          if (res.data) {
            this.page = res.data.page;
            this.posts = isInitial
              ? res.data.posts
              : [...this.posts, ...res.data.posts];
            this.hasMore = res.data.hasMore;
          }
        },
        error: (err: { message?: string }) => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.errorMessage = err?.message || 'Unable to load Explore photographs.';
        },
      });
  }

  onLoadMore(): void {
    if (!this.hasMore || this.isLoadingMore) {
      return;
    }
    this.loadExplore(this.page + 1);
  }
}
