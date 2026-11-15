import { Component } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-search-users',
  templateUrl: './search-users.component.html',
  styleUrls: ['./search-users.component.css'],
})
export class SearchUsersComponent {
  query = '';
  results: User[] = [];
  hasSearched = false;
  isLoading = false;
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  clearSearch(): void {
    this.query = '';
    this.results = [];
    this.hasSearched = false;
    this.errorMessage = '';
  }

  onSearch(): void {
    const trimmed = this.query.trim();
    if (!trimmed) {
      this.results = [];
      this.hasSearched = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.hasSearched = true;

    this.apiService
      .get<ApiResponse<User[]>>('/users/search', { q: trimmed })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.results = res.data || [];
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.message || 'Unable to search users right now.';
        },
      });
  }
}
