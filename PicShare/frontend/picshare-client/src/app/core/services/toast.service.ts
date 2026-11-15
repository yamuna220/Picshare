import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private counter = 0;

  readonly toast$: Observable<ToastMessage | null> = this.toastSubject.asObservable();

  show(variant: ToastVariant, text: string, durationMs: number = 4000): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
    this.counter += 1;
    this.toastSubject.next({
      id: this.counter,
      variant,
      text,
    });

    if (durationMs > 0) {
      this.dismissTimer = setTimeout(() => {
        this.clear();
      }, durationMs);
    }
  }

  success(text: string): void {
    this.show('success', text);
  }

  error(text: string): void {
    this.show('error', text);
  }

  info(text: string): void {
    this.show('info', text);
  }

  clear(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.toastSubject.next(null);
  }
}
