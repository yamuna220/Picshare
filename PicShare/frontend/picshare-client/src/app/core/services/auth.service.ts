import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse, HealthStatus } from '../models/api-response.model';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../models/user.model';

const TOKEN_STORAGE_KEY = 'picshare_access_token';
const USER_STORAGE_KEY = 'picshare_current_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<User | null>(
    this.readStoredUser()
  );

  readonly currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private api: ApiService, private router: Router) {}

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  checkBackendHealth(): Observable<HealthStatus> {
    return this.api.get<HealthStatus>('/health');
  }

  register(payload: RegisterPayload): Observable<ApiResponse<{ user: User }>> {
    return this.api.post<ApiResponse<{ user: User }>>('/auth/register', payload);
  }

  login(payload: LoginPayload): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<ApiResponse<AuthResponse>>('/auth/login', payload).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.persistSession(res.data.token, res.data.user);
        }
      })
    );
  }

  refreshCurrentUser(): Observable<ApiResponse<{ user: User }>> {
    return this.api.get<ApiResponse<{ user: User }>>('/auth/me').pipe(
      tap((res) => {
        if (res.success && res.data?.user) {
          this.updateStoredUser(res.data.user);
        }
      })
    );
  }

  logout(redirectToLogin: boolean = true): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.currentUserSubject.next(null);
    if (redirectToLogin) {
      this.router.navigate(['/login']);
    }
  }

  updateStoredUser(user: User): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private persistSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
