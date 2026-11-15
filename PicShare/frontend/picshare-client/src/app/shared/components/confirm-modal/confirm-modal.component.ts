import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.css'],
})
export class ConfirmModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() description = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() variant: 'primary' | 'danger' = 'primary';
  @Input() isBusy = false;
  @Input() errorMessage = '';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen && !this.isBusy) {
      this.onCancel();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isBusy) {
      this.onCancel();
    }
  }

  onCancel(): void {
    if (!this.isBusy) {
      this.cancelled.emit();
    }
  }

  onConfirm(): void {
    if (!this.isBusy) {
      this.confirmed.emit();
    }
  }
}
