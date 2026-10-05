import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { philippineMobileNumberValidator } from '../mobile-number.validator';
import { GuestBookingSessionService } from '../../booking/guest-booking-session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly guestBookingSession = inject(GuestBookingSessionService);
  readonly passwordVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly loginForm = new FormGroup({
    mobileNumber: new FormControl('', {
      validators: [Validators.required, philippineMobileNumberValidator],
      nonNullable: true
    }),
    password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(8)],
      nonNullable: true
    })
  });

  get mobileNumberControl() {
    return this.loginForm.controls.mobileNumber;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login(this.loginForm.getRawValue()).pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => void this.router.navigateByUrl(this.loginDestination()),
      error: (error: HttpErrorResponse) => this.errorMessage.set(
        error.status === 429
          ? 'Too many sign-in attempts. Please try again later.'
          : error.error?.detail ?? error.error?.title ?? 'Unable to sign in. Please check your credentials.'
      )
    });
  }

  private loginDestination(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl === '/booking/route' || returnUrl === '/booking/details'
      ? returnUrl
      : '/booking/route';
  }

  continueAsGuest(): void {
    this.guestBookingSession.startGuestMode();
    void this.router.navigate(['/booking/route']);
  }
}