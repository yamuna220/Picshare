import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastMessage, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent {
  readonly toast$: Observable<ToastMessage | null>;

  constructor(private toastService: ToastService) {
    this.toast$ = this.toastService.toast$;
  }

  dismiss(): void {
    this.toastService.clear();
  }
}
