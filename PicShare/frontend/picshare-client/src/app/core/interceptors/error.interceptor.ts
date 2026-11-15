import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && this.authService.isAuthenticated()) {
          this.authService.logout(true);
        }

        const serverMessage =
          error.error && typeof error.error.message === 'string'
            ? error.error.message
            : error.message || 'An unexpected network error occurred.';

        return throwError({
          status: error.status,
          message: serverMessage,
          details: error.error ? error.error.details : undefined,
        });
      })
    );
  }
}
