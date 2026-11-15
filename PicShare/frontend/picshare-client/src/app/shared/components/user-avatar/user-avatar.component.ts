import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css'],
})
export class UserAvatarComponent implements OnChanges {
  @Input() src: string | null | undefined = '';
  @Input() username: string = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  imageFailed = false;

  get resolvedSrc(): string {
    if (!this.src) {
      return '';
    }
    if (this.src.startsWith('/api') && environment.apiUrl.startsWith('http')) {
      const backendOrigin = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${backendOrigin}${this.src}`;
    }
    return this.src;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.src) {
      this.imageFailed = false;
    }
  }

  get initials(): string {
    if (!this.username) {
      return 'U';
    }
    return this.username.slice(0, 2).toUpperCase();
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
