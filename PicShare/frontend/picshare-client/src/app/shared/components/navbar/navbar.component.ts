import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly currentUser$: Observable<User | null>;
  readonly unreadCount$: Observable<number>;
  readonly pendingRequestsCount$: Observable<number>;

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.unreadCount$ = this.notificationService.unreadCount$;
    this.pendingRequestsCount$ = this.notificationService.pendingRequestsCount$;
  }

  ngOnInit(): void {
    this.fetchCountsIfAuthenticated();

    this.subscriptions.add(
      this.currentUser$.subscribe((user) => {
        if (user && this.authService.isAuthenticated()) {
          this.fetchCountsIfAuthenticated();
        }
      })
    );

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => {
          this.fetchCountsIfAuthenticated();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  onLogout(): void {
    this.notificationService.clearCounts();
    this.authService.logout(true);
  }

  formatBadge(count: number | null): string {
    if (!count || count <= 0) {
      return '';
    }
    return count > 99 ? '99+' : String(count);
  }

  private fetchCountsIfAuthenticated(): void {
    if (this.authService.isAuthenticated()) {
      this.notificationService.refreshCounts().subscribe({
        error: () => {
          // Handled silently unless session is invalid (401 handled by ErrorInterceptor)
        },
      });
    }
  }
}
