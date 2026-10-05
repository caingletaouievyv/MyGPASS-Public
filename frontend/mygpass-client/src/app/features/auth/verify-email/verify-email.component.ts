import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';

type VerificationState = 'loading' | 'success' | 'error' | 'missing';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly verificationState = signal<VerificationState>('loading');
  readonly message = signal('Verifying your email...');
  readonly isSubmitting = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      const token = params.get('token') ?? ''.trim();

      if (!token) {
        this.verificationState.set('missing');
        this.message.set('The verification link is missing a valid token.');
        return;
      }

      this.verifyEmail(token);
    });
  }

  verifyEmail(token: string): void {
    this.verificationState.set('loading');
    this.message.set('Verifying your email...');
    this.isSubmitting.set(true);

    this.authService.verifyEmail(token)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.verificationState.set('success');
          this.message.set(response.message || 'Your email has been verified successfully.');
        },
        error: (error: HttpErrorResponse) => {
          const detail = error.error?.detail ?? error.error?.title ?? 'Your verification link is invalid or has expired.';
          this.verificationState.set('error');
          this.message.set(detail);
        }
      });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
