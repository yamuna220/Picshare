import { HttpClient } from '@angular/common/http';
import { OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'authMedia',
})
export class AuthMediaPipe implements PipeTransform, OnDestroy {
  private lastUrl = '';
  private lastResult$: Observable<SafeUrl | string> | null = null;
  private objectUrls: string[] = [];

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  private resolveUrl(url: string): string {
    if (url.startsWith('/api') && environment.apiUrl.startsWith('http')) {
      const backendOrigin = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${backendOrigin}${url}`;
    }
    return url;
  }

  transform(url: string | null | undefined): Observable<SafeUrl | string> {
    if (!url) {
      return of('');
    }

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return of(url);
    }

    const targetUrl = this.resolveUrl(url);

    if (targetUrl === this.lastUrl && this.lastResult$) {
      return this.lastResult$;
    }

    this.lastUrl = targetUrl;
    this.lastResult$ = this.http.get(targetUrl, { responseType: 'blob' }).pipe(
      map((blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.objectUrls.push(objectUrl);
        return this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      }),
      catchError(() => of('')),
      shareReplay(1)
    );

    return this.lastResult$;
  }

  ngOnDestroy(): void {
    this.objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    this.objectUrls = [];
  }
}
